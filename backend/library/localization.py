from __future__ import annotations

from functools import lru_cache
from typing import Any

import yaml
from django.utils.translation import get_language_from_request


def get_request_language(request) -> str:
    if request is None:
        return "en"

    explicit = request.query_params.get("lang") if hasattr(request, "query_params") else None
    language = explicit or get_language_from_request(request, check_path=False) or "en"
    return "fr" if language.lower().startswith("fr") else "en"


def _pick_localized(value: Any, language: str) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get(language) or value.get("en") or value.get("fr") or ""
    return ""


@lru_cache(maxsize=32)
def build_translation_index(raw_content: str) -> dict[str, Any]:
    if not raw_content:
        return {"framework": {}, "domains": {}, "controls": {}, "requirements": {}}

    data = yaml.safe_load(raw_content) or {}

    domains = {
        item.get("code"): item
        for item in data.get("domains", [])
        if item.get("code")
    }
    controls = {
        item.get("code"): item
        for item in data.get("controls", [])
        if item.get("code")
    }
    requirements = {}
    for control in data.get("controls", []):
        for requirement in control.get("requirements", []):
            requirement_id = requirement.get("id")
            if requirement_id:
                requirements[requirement_id] = requirement

    return {
        "framework": data.get("framework", {}),
        "version": data.get("version", {}),
        "domains": domains,
        "controls": controls,
        "requirements": requirements,
    }


class LibraryTranslationResolver:
    def __init__(self, raw_content: str):
        self.index = build_translation_index(raw_content or "")

    def framework_name(self, language: str) -> str:
        return _pick_localized(self.index["framework"].get("name", {}), language)

    def framework_description(self, language: str) -> str:
        return _pick_localized(self.index["version"].get("description", {}), language)

    def requirement_content(self, code: str) -> dict[str, str]:
        domain = self.index["domains"].get(code)
        if domain:
            return {
                "title": domain.get("name", {}),
                "description": domain.get("description", {}),
            }

        control = self.index["controls"].get(code)
        if control:
            return {
                "title": control.get("title", {}),
                "description": control.get("description", {}),
                "implementation_guidance": control.get("guidance", {}),
            }

        requirement = self.index["requirements"].get(code)
        if requirement:
            return {
                "title": requirement.get("text", {}),
                "description": requirement.get("text", {}),
                "implementation_guidance": requirement.get(
                    "implementation_guidance", {}
                ),
            }

        return {}

    def translated_requirement_content(self, code: str, language: str) -> dict[str, str]:
        content = self.requirement_content(code)
        if not content:
            return {}

        return {
            key: _pick_localized(value, language)
            for key, value in content.items()
        }
