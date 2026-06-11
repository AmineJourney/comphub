import argparse
from collections import defaultdict
from pathlib import Path
import re

import yaml


def sanitize_code(value: str, fallback: str) -> str:
    text = (value or "").strip()
    if not text:
        text = fallback
    return re.sub(r"\s+", "-", text)


def bilingual_from_value(value, locale="en", translations=None, field=None):
    if isinstance(value, dict):
        en = value.get("en") or value.get("fr") or ""
        fr = value.get("fr") or value.get("en") or ""
        return {"en": en, "fr": fr}

    text = (value or "").strip() if isinstance(value, str) else ""
    translations = translations or {}
    fr_block = translations.get("fr", {}) if isinstance(translations, dict) else {}
    translated = ""
    if isinstance(fr_block, dict) and field:
        translated = (fr_block.get(field) or "").strip()

    if locale == "fr":
        fr = text
        en = translated or text
    else:
        en = text
        fr = translated or text

    return {"en": en, "fr": fr}


def clean_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def ensure_bilingual_app_format(data):
    framework = data.get("framework", {})
    version = data.get("version", {})
    framework["name"] = bilingual_from_value(framework.get("name", {}))
    version["description"] = bilingual_from_value(version.get("description", {}))

    for domain in data.get("domains", []):
        domain["name"] = bilingual_from_value(domain.get("name", {}))
        domain["description"] = bilingual_from_value(domain.get("description", {}))

    for control in data.get("controls", []):
        control["title"] = bilingual_from_value(control.get("title", {}))
        control["description"] = bilingual_from_value(control.get("description", {}))
        control["guidance"] = bilingual_from_value(control.get("guidance", {}))
        for requirement in control.get("requirements", []):
            requirement["text"] = bilingual_from_value(requirement.get("text", {}))
            if "implementation_guidance" in requirement:
                requirement["implementation_guidance"] = bilingual_from_value(
                    requirement.get("implementation_guidance", {})
                )

    if not framework.get("slug"):
        framework["slug"] = sanitize_code(
            framework["name"].get("en") or framework["name"].get("fr"), "framework"
        ).lower()

    return {
        "framework": framework,
        "version": version,
        "domains": data.get("domains", []),
        "controls": data.get("controls", []),
    }


def convert_intuitem_format(data):
    locale = data.get("locale", "en")
    translations = data.get("translations", {}) or {}
    framework_obj = data.get("objects", {}).get("framework", {})
    nodes = framework_obj.get("requirement_nodes", []) or []

    node_by_urn = {node.get("urn"): node for node in nodes if node.get("urn")}
    children = defaultdict(list)
    for node in nodes:
        parent_urn = node.get("parent_urn")
        if parent_urn:
            children[parent_urn].append(node)

    root_nodes = [node for node in nodes if not node.get("parent_urn")]
    domain_map = {}
    domains = []

    for idx, node in enumerate(root_nodes, start=1):
        domain_code = sanitize_code(node.get("ref_id"), f"DOMAIN-{idx}")
        domain_map[node.get("urn")] = domain_code
        domains.append(
            {
                "code": domain_code,
                "name": bilingual_from_value(
                    node.get("name", ""),
                    locale=locale,
                    translations=node.get("translations"),
                    field="name",
                ),
                "description": bilingual_from_value(
                    node.get("description", "") or node.get("name", ""),
                    locale=locale,
                    translations=node.get("translations"),
                    field="description",
                ),
                "domain_type": "section",
            }
        )

    def find_domain_code(node):
        current = node
        while current:
            current_urn = current.get("urn")
            if current_urn in domain_map:
                return domain_map[current_urn]
            current = node_by_urn.get(current.get("parent_urn"))
        return domains[0]["code"] if domains else "DOMAIN-1"

    def assessable_children(node):
        return [child for child in children.get(node.get("urn"), []) if child.get("assessable")]

    control_nodes = []
    for node in nodes:
        if not node.get("assessable"):
            continue
        parent = node_by_urn.get(node.get("parent_urn"))
        if not parent or not parent.get("assessable"):
            control_nodes.append(node)

    controls = []
    for idx, node in enumerate(control_nodes, start=1):
        control_code = sanitize_code(node.get("ref_id"), f"CTRL-{idx}")
        desc_text = clean_text(node.get("description")) or clean_text(node.get("name"))

        control = {
            "code": control_code,
            "domain": find_domain_code(node),
            "title": bilingual_from_value(
                node.get("name") or node.get("ref_id") or control_code,
                locale=locale,
                translations=node.get("translations"),
                field="name",
            ),
            "description": bilingual_from_value(
                desc_text or node.get("ref_id") or control_code,
                locale=locale,
                translations=node.get("translations"),
                field="description",
            ),
            "guidance": bilingual_from_value(
                clean_text(node.get("description")) or clean_text(node.get("name")),
                locale=locale,
                translations=node.get("translations"),
                field="description",
            ),
            "requirements": [],
        }

        for req_idx, req_node in enumerate(assessable_children(node), start=1):
            req_code = sanitize_code(
                req_node.get("ref_id"), f"{control_code}.{req_idx}"
            )
            req_text = clean_text(req_node.get("description")) or clean_text(req_node.get("name"))
            control["requirements"].append(
                {
                    "id": req_code,
                    "control": control_code,
                    "text": bilingual_from_value(
                        req_text or req_code,
                        locale=locale,
                        translations=req_node.get("translations"),
                        field="description",
                    ),
                }
            )

        controls.append(control)

    top_name = bilingual_from_value(
        data.get("name", framework_obj.get("name", "")),
        locale=locale,
        translations=translations,
        field="name",
    )
    top_description = bilingual_from_value(
        data.get("description", framework_obj.get("description", "")),
        locale=locale,
        translations=translations,
        field="description",
    )

    slug_source = data.get("ref_id") or framework_obj.get("ref_id") or top_name["en"]
    slug = sanitize_code(slug_source, "framework").lower().replace("/", "").replace(":", "-")

    publication_year = 2024
    publication_date = clean_text(data.get("publication_date"))
    if publication_date and re.match(r"^\d{4}", publication_date):
        publication_year = int(publication_date[:4])

    version_name = clean_text(data.get("version")) or "1"
    if isinstance(data.get("version"), int):
        version_name = str(data["version"])

    return {
        "framework": {
            "name": top_name,
            "slug": slug,
            "provider": {
                "name": clean_text(data.get("provider")),
            },
        },
        "version": {
            "name": version_name,
            "release_year": publication_year,
            "description": top_description,
        },
        "domains": domains,
        "controls": controls,
    }


def convert_file(input_path: Path, output_path: Path):
    with input_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    if "framework" in data and "controls" in data:
        converted = ensure_bilingual_app_format(data)
    elif data.get("objects", {}).get("framework", {}).get("requirement_nodes"):
        converted = convert_intuitem_format(data)
    else:
        raise ValueError(f"Unsupported YAML format: {input_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(
            converted,
            handle,
            allow_unicode=True,
            sort_keys=False,
            width=1000,
        )


def main():
    parser = argparse.ArgumentParser(description="Convert external framework YAML to ComplianceHub format.")
    parser.add_argument("input", help="Input YAML path")
    parser.add_argument("output", help="Output YAML path")
    args = parser.parse_args()

    convert_file(Path(args.input), Path(args.output))


if __name__ == "__main__":
    main()
