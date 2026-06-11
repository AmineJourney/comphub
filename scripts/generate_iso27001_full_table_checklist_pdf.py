from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "ISO27001_CHECKLIST_TABLE_COMPLETE_FR.pdf"


def register_font() -> str:
    candidates = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/calibri.ttf"),
        Path("C:/Windows/Fonts/tahoma.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            pdfmetrics.registerFont(TTFont("AppFont", str(candidate)))
            return "AppFont"
    return "Helvetica"


FONT_NAME = register_font()
styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    "Title",
    parent=styles["Title"],
    fontName=FONT_NAME,
    fontSize=18,
    leading=22,
    textColor=colors.HexColor("#17324D"),
)
heading_style = ParagraphStyle(
    "Heading",
    parent=styles["Heading2"],
    fontName=FONT_NAME,
    fontSize=13,
    leading=16,
    textColor=colors.HexColor("#264C73"),
    spaceAfter=8,
)
normal_style = ParagraphStyle(
    "Normal",
    parent=styles["Normal"],
    fontName=FONT_NAME,
    fontSize=9,
    leading=12,
)


def wrap(text: str) -> Paragraph:
    return Paragraph(text, normal_style)


MANAGEMENT_SECTIONS = {
    "Clause 4 - Contexte de l'organisation": [
        (
            "4.1",
            "Comprendre l'organisation et son contexte",
            "L'entreprise a-t-elle identifie les enjeux internes et externes pouvant affecter le SMSI ?",
            "Analyse de contexte, SWOT, compte-rendu d'ateliers",
        ),
        (
            "4.2",
            "Comprendre les besoins et attentes des parties interessees",
            "Les parties interessees et leurs exigences applicables sont-elles documentees ?",
            "Registre des parties interessees, registre des exigences",
        ),
        (
            "4.3",
            "Determiner le perimetre du SMSI",
            "Le perimetre est-il formellement defini, justifie et defendable ?",
            "Document de perimetre, cartographie des sites et services",
        ),
        (
            "4.4",
            "Etablir, mettre en oeuvre, maintenir et ameliorer le SMSI",
            "Le SMSI est-il decrit avec ses processus, interfaces et mecanismes de pilotage ?",
            "Cartographie des processus, procedure SMSI, gouvernance",
        ),
    ],
    "Clause 5 - Leadership": [
        (
            "5.1",
            "Leadership et engagement",
            "La direction soutient-elle activement le SMSI et fournit-elle les ressources necessaires ?",
            "Comptes-rendus de comite, budget, arbitrages de direction",
        ),
        (
            "5.2",
            "Politique",
            "Une politique de securite approuvee et communiquee existe-t-elle ?",
            "Politique approuvee, diffusion interne, historique de revision",
        ),
        (
            "5.3",
            "Roles, responsabilites et autorites",
            "Les roles et responsabilites securite sont-ils definis et compris ?",
            "RACI, fiches de poste, organigramme, lettres de mission",
        ),
    ],
    "Clause 6 - Planification": [
        (
            "6.1.1",
            "Actions face aux risques et opportunites",
            "Les risques et opportunites susceptibles d'impacter le SMSI sont-ils identifies ?",
            "Registre des risques, hypotheses, decisions de traitement",
        ),
        (
            "6.1.2",
            "Evaluation des risques de securite de l'information",
            "La methode d'analyse des risques est-elle definie, coherente et appliquee ?",
            "Methodologie, matrice de cotation, registre des risques",
        ),
        (
            "6.1.3",
            "Traitement des risques de securite de l'information",
            "Les options de traitement, la SoA et les validations associees existent-elles ?",
            "Plan de traitement, SoA, validations de risques acceptes",
        ),
        (
            "6.2",
            "Objectifs de securite de l'information et planification",
            "Des objectifs mesurables et suivis ont-ils ete definis ?",
            "Objectifs, KPI, tableau de bord, plan d'action",
        ),
        (
            "6.3",
            "Planification des modifications",
            "Les changements du SMSI sont-ils planifies et maitrises ?",
            "Procedure de changement, demandes de changement, PV d'arbitrage",
        ),
    ],
    "Clause 7 - Support": [
        (
            "7.1",
            "Ressources",
            "Les ressources necessaires au fonctionnement du SMSI sont-elles definies et disponibles ?",
            "Budget, plans de charge, feuille de route, contrats de prestation",
        ),
        (
            "7.2",
            "Competence",
            "Les competences requises ont-elles ete identifiees et couvertes ?",
            "Plan de formation, certifications, matrices de competences",
        ),
        (
            "7.3",
            "Sensibilisation",
            "Les collaborateurs connaissent-ils les exigences securite et leur role ?",
            "Campagnes de sensibilisation, quiz, feuilles de presence",
        ),
        (
            "7.4",
            "Communication",
            "Les communications internes et externes relatives au SMSI sont-elles organisees ?",
            "Plan de communication, modeles d'escalade, messages types",
        ),
        (
            "7.5",
            "Informations documentees",
            "Les documents du SMSI sont-ils maitrises, approuves, versionnes et revus ?",
            "Procedure documentaire, registre documentaire, historique des versions",
        ),
    ],
    "Clause 8 - Fonctionnement": [
        (
            "8.1",
            "Planification et maitrise operationnelles",
            "Les processus necessaires au fonctionnement du SMSI sont-ils executes et traces ?",
            "Procedures, tickets, journaux, revues operationnelles",
        ),
        (
            "8.2",
            "Evaluation des risques en exploitation",
            "Les evaluations de risques sont-elles realisees aux moments pertinents ?",
            "Registre a jour, ateliers de re-evaluation, analyses de changement",
        ),
        (
            "8.3",
            "Traitement des risques en exploitation",
            "Les actions de traitement sont-elles mises en oeuvre et suivies ?",
            "Suivi des actions, preuves de deploiement, validations",
        ),
    ],
    "Clause 9 - Evaluation des performances": [
        (
            "9.1",
            "Surveillance, mesure, analyse et evaluation",
            "Des indicateurs sont-ils definis, alimentes et revus periodiquement ?",
            "KPI, tableaux de bord, comptes-rendus de revue",
        ),
        (
            "9.2",
            "Audit interne",
            "Un programme d'audit interne existe-t-il et les audits sont-ils realises ?",
            "Programme d'audit, rapports, non-conformites, plans d'action",
        ),
        (
            "9.3",
            "Revue de direction",
            "La direction realise-t-elle une revue formelle du SMSI ?",
            "Support de revue, compte-rendu, decisions de direction",
        ),
    ],
    "Clause 10 - Amelioration": [
        (
            "10.1",
            "Amelioration continue",
            "Le SMSI est-il ameliore de facon continue sur la base des resultats et retours ?",
            "Feuille d'amelioration, retrospectives, backlog d'amelioration",
        ),
        (
            "10.2",
            "Non-conformite et action corrective",
            "Les ecarts, incidents et non-conformites donnent-ils lieu a des actions correctives efficaces ?",
            "Registre des non-conformites, RCA, actions correctives, verification d'efficacite",
        ),
    ],
}


ANNEX_A_SECTIONS = {
    "Annexe A.5 - Controles organisationnels": [
        ("A.5.1", "Politiques de securite", "Les politiques de securite sont-elles formelles, approuvees et revues ?", "Politique SSI, approbations, planning de revue"),
        ("A.5.2", "Roles et responsabilites", "Les roles securite sont-ils definis et communiques ?", "RACI, organigrammes, fiches de poste"),
        ("A.5.3", "Separation des taches", "Les taches incompatibles sont-elles separees ?", "Matrice SoD, revues d'acces"),
        ("A.5.4", "Responsabilites de la direction", "La direction parraine-t-elle activement la securite ?", "PV comite, revues de direction"),
        ("A.5.7", "Renseignement sur les menaces", "L'organisation suit-elle les menaces pertinentes ?", "Abonnements CERT, notes de veille"),
        ("A.5.9", "Inventaire des actifs", "Les actifs informationnels et techniques sont-ils inventoried et tenus a jour ?", "Inventaire, CMDB, registre des proprietaires"),
        ("A.5.12", "Classification de l'information", "Les informations sont-elles classees selon leur sensibilite ?", "Procedure de classification, exemples"),
        ("A.5.15", "Controle d'acces", "Une politique de controle d'acces existe-t-elle ?", "Politique IAM, workflows d'habilitation"),
        ("A.5.19", "Securite dans les relations fournisseurs", "Les fournisseurs critiques sont-ils evalues et suivis ?", "Questionnaires, contrats, revues"),
        ("A.5.24", "Gestion des incidents", "Le dispositif de gestion des incidents est-il defini et opere ?", "Procedure IR, tickets, post-mortems"),
        ("A.5.29", "Continuite d'activite", "La continuite des activites informationnelles est-elle preparee ?", "PCA, BIA, exercices"),
        ("A.5.31", "Exigences legales et reglementaires", "Les obligations legales et contractuelles sont-elles connues et suivies ?", "Registre legal, clauses contractuelles"),
        ("A.5.34", "Protection des PII", "Les donnees personnelles sont-elles protegees conformement aux exigences applicables ?", "Politique privacy, DPIA, registre de traitements"),
        ("A.5.35", "Revue independante", "Le SMSI est-il audite ou revu de maniere independante ?", "Rapports d'audit, revues externes"),
        ("A.5.37", "Gestion de la documentation", "Les documents de securite sont-ils maitrises ?", "Registre documentaire, approbations"),
    ],
    "Annexe A.6 - Controles humains": [
        ("A.6.1", "Verification avant embauche", "Les verifications prealables sont-elles proportionnees au risque ?", "Processus RH, dossiers d'embauche"),
        ("A.6.2", "Conditions d'emploi", "Les contrats incluent-ils les obligations de securite et confidentialite ?", "Contrats, NDA, clauses RH"),
        ("A.6.3", "Sensibilisation et formation", "Les collaborateurs sont-ils formes a la securite ?", "Registres de formation, quiz"),
        ("A.6.4", "Processus disciplinaire", "Un processus disciplinaire existe-t-il en cas de non-respect ?", "Procedure RH, cas traites"),
        ("A.6.5", "Responsabilites apres cessation", "Les obligations de confidentialite subsistent-elles apres le depart ?", "Clauses, checklist de sortie"),
        ("A.6.6", "Accords de confidentialite", "Les engagements de confidentialite sont-ils adaptes et conserves ?", "NDA, contrats"),
        ("A.6.7", "Teletravail", "Les regles de travail a distance sont-elles definies et appliquees ?", "Politique teletravail, mesures techniques"),
        ("A.6.8", "Signalement des evenements", "Le personnel sait-il comment signaler un evenement ou incident ?", "Procedure, campagnes de sensibilisation"),
    ],
    "Annexe A.7 - Controles physiques": [
        ("A.7.1", "Perimetres physiques de securite", "Les zones sensibles sont-elles identifiees et protegees ?", "Plans de site, controles d'acces"),
        ("A.7.2", "Entrees physiques", "Les acces physiques sont-ils controles et traces ?", "Badges, journaux visiteurs"),
        ("A.7.3", "Bureaux, salles et installations", "Les locaux critiques sont-ils securises ?", "Videosurveillance, verrouillage"),
        ("A.7.4", "Protection contre les menaces physiques", "Les protections contre feu, eau, temperature, electricite existent-elles ?", "Maintenance, dispositifs de protection"),
        ("A.7.7", "Bureaux et postes propres", "Des regles de bureau propre et ecran propre existent-elles ?", "Politique, campagnes, controles"),
        ("A.7.8", "Emplacement et protection des equipements", "Les equipements sont-ils proteges contre acces non autorise et dommages ?", "Inventaire, photos, procedures"),
        ("A.7.10", "Supports de stockage", "Les supports sont-ils manipules et detruits de maniere securisee ?", "Certificats de destruction, procedure"),
        ("A.7.14", "Elimination ou reutilisation securisee", "Les equipements sont-ils effaces avant cession ou reemploi ?", "Rapports d'effacement, certificats"),
    ],
    "Annexe A.8 - Controles technologiques": [
        ("A.8.1", "Terminaux utilisateurs", "Les postes et terminaux sont-ils securises ?", "MDM, EDR, durcissement"),
        ("A.8.2", "Droits privilegies", "Les acces privilegies sont-ils restreints et revus ?", "PAM, revues d'acces, journaux"),
        ("A.8.5", "Authentification securisee", "Les mecanismes d'authentification forte sont-ils deployes ?", "MFA, politiques de mot de passe"),
        ("A.8.7", "Protection contre les malwares", "Les protections anti-malware sont-elles actives et supervisees ?", "Console EDR/AV, rapports"),
        ("A.8.8", "Gestion des vulnerabilites techniques", "Les vulnerabilites sont-elles identifiees, priorisees et corrigees ?", "Scans, backlog de remediations"),
        ("A.8.9", "Gestion de configuration", "Les configurations securisees sont-elles definies et appliquees ?", "Baselines, GPO, IaC"),
        ("A.8.12", "Prevention des fuites de donnees", "Des mesures de prevention de fuite existent-elles ?", "DLP, regles CASB, politiques"),
        ("A.8.13", "Surveillance des activites", "Les systemes et reseaux sont-ils surveilles ?", "SIEM, alertes, tableaux de bord"),
        ("A.8.15", "Securite du reseau", "Le reseau est-il segmente et protege ?", "Pare-feu, NAC, schemas"),
        ("A.8.16", "Cryptographie", "Le chiffrement est-il utilise la ou necessaire ?", "Politique crypto, configurations TLS"),
        ("A.8.19", "Journalisation", "Les journaux pertinents sont-ils collectes et proteges ?", "Politique de logs, retention"),
        ("A.8.21", "Sauvegardes", "Les sauvegardes sont-elles realisees, protegees et testees ?", "Rapports de sauvegarde, tests de restauration"),
        ("A.8.24", "Conception securisee", "Les principes de securite sont-ils integres a la conception ?", "Normes d'architecture, revues"),
        ("A.8.25", "Cycle de developpement securise", "Le developpement suit-il un SDLC securise ?", "Procedures DevSecOps, pipelines"),
        ("A.8.28", "Codage securise", "Des pratiques de codage securise et de revue existent-elles ?", "Guidelines, revues de code, SAST"),
        ("A.8.29", "Tests de securite", "Les applications sont-elles testees pour les vulnerabilites ?", "Pentests, DAST, rapports"),
        ("A.8.32", "Gestion des changements", "Les changements techniques sont-ils autorises, testes et traces ?", "CAB, tickets, journal des changements"),
        ("A.8.34", "Protection des systemes d'information pendant les audits", "Les activites d'audit preservent-elles la securite et la disponibilite ?", "Procedures d'audit, fenetres d'intervention"),
    ],
}


def build_table(section_title: str, rows):
    header = [
        wrap("Reference"),
        wrap("Exigence / controle"),
        wrap("Questions de verification"),
        wrap("Preuves attendues"),
        wrap("Statut"),
        wrap("Commentaires"),
    ]
    table_data = [header]
    for ref, label, question, evidence in rows:
        table_data.append(
            [
                wrap(ref),
                wrap(label),
                wrap(question),
                wrap(evidence),
                wrap("A completer"),
                wrap(""),
            ]
        )

    table = Table(
        table_data,
        colWidths=[2.0 * cm, 5.0 * cm, 8.2 * cm, 6.0 * cm, 2.3 * cm, 4.0 * cm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3E5F8A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.black),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F7FB")]),
            ]
        )
    )
    return table


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT_NAME, 9)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawRightString(28 * cm, 1.0 * cm, f"Page {doc.page}")
    canvas.restoreState()


def main():
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=landscape(A4),
        leftMargin=1.0 * cm,
        rightMargin=1.0 * cm,
        topMargin=1.1 * cm,
        bottomMargin=1.3 * cm,
        title="ISO 27001 - Checklist table complete",
        author="Codex",
    )

    elements = []
    elements.append(Paragraph("ISO/IEC 27001 - Checklist Tabulaire Complete de Mise en Oeuvre", title_style))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(
        Paragraph(
            "Ce document reprend le format de checklist tabulaire de votre exemple, "
            "mais couvre a la fois les clauses de management 4 a 10 et les controles de l'Annexe A. "
            "Il peut etre utilise comme support de gap analysis, de pilotage de projet et de pre-audit.",
            normal_style,
        )
    )
    elements.append(Spacer(1, 0.5 * cm))

    for section, rows in MANAGEMENT_SECTIONS.items():
        elements.append(Paragraph(section, heading_style))
        elements.append(build_table(section, rows))
        elements.append(PageBreak())

    for section, rows in ANNEX_A_SECTIONS.items():
        elements.append(Paragraph(section, heading_style))
        elements.append(build_table(section, rows))
        elements.append(PageBreak())

    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
