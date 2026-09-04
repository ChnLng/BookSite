from pathlib import Path
from io import BytesIO
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from pypdf import PdfReader, PdfWriter

ROOT = Path('/Volumes/Seagate1TB/BookSite')
OUT = ROOT / 'public/guides/guide-tester-special-invite.pdf'
TMP = ROOT / 'tmp/pdfs/special-guest'
TMP.mkdir(parents=True, exist_ok=True)

FONT_DIR = Path('/Users/ding/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype')
pdfmetrics.registerFont(TTFont('Noto', str(FONT_DIR / 'NotoSans-Regular.ttf')))
pdfmetrics.registerFont(TTFont('NotoB', str(FONT_DIR / 'NotoSans-Bold.ttf')))

W, H = 595.28, 841.89
M, CW = 43, 509.28
INK = HexColor('#252241')
MUTED = HexColor('#68647c')
PURPLE = HexColor('#6a49b8')
LILAC = HexColor('#f1edfc')
LINE = HexColor('#ddd4ef')
GREEN = HexColor('#147c67')
AMBER = HexColor('#805213')
AMBER_BG = HexColor('#fff6e5')

source_payment = Path('/Users/ding/Desktop/截屏2026-09-04 22.50.12.png')
source_install = Path('/Users/ding/Desktop/截屏2026-09-04 22.51.38.png')
source_checkout = Path('/Users/ding/Desktop/截屏2026-09-04 22.52.45.png')

def anonymize_payment():
    out = TMP / 'payment-methods-anonymized.png'
    im = Image.open(source_payment).convert('RGB')
    draw = ImageDraw.Draw(im)
    # Cover the account line while keeping the Payment methods heading readable.
    draw.rectangle((95, 84, 330, 121), fill='white')
    im.save(out, optimize=True)
    return out

payment_image = anonymize_payment()
C = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
C.setTitle('Visd AR | Tester spécial invité - Installation Android gratuite')
C.setAuthor('Visd AR')
C.setSubject('Guide illustré avec carte de test Google Play, sans carte bancaire ni code promo.')
C.setCreator('Visd AR')
PAGE = 0
TOTAL = 7

def para(text, x, top, width=CW, size=11.5, color=INK, bold=False, leading=None):
    style = ParagraphStyle('p', fontName='NotoB' if bold else 'Noto', fontSize=size, leading=leading or size * 1.45, textColor=color)
    p = Paragraph(text, style)
    _, height = p.wrap(width, H)
    p.drawOn(C, x, H - top - height)
    return top + height

def box(x, top, width, height, fill=LILAC, stroke=LINE, radius=15):
    C.setFillColor(fill); C.setStrokeColor(stroke); C.setLineWidth(.65)
    C.roundRect(x, H - top - height, width, height, radius, fill=1, stroke=1)

def line(x1, top1, x2, top2, color=LINE, width=.7):
    C.setStrokeColor(color); C.setLineWidth(width); C.line(x1, H - top1, x2, H - top2)

def header(kicker, title, subtitle=None):
    global PAGE
    PAGE += 1
    C.setFillColor(HexColor('#fdfcfe')); C.rect(0, 0, W, H, fill=1, stroke=0)
    C.saveState(); C.setFillAlpha(.55); C.setFillColor(HexColor('#e8e0fa')); C.circle(W - 3, H - 25, 96, fill=1, stroke=0)
    C.setFillColor(HexColor('#e5f7f9')); C.circle(W - 100, H + 33, 102, fill=1, stroke=0); C.restoreState()
    C.drawImage(str(ROOT / 'public/images/logo.png'), M, H - 62, 28, 28, mask='auto', preserveAspectRatio=True)
    para('Visd AR', M + 37, 32, 180, size=13, bold=True)
    para('TESTER SPÉCIAL INVITÉ', W - 205, 37, 162, size=8.2, color=MUTED, bold=True)
    line(M, 78, W - M, 78)
    para(kicker.upper(), M, 96, CW, size=9.5, color=PURPLE, bold=True)
    end = para(title, M, 118, CW, size=25, bold=True, leading=31)
    if subtitle:
        end = para(subtitle, M, end + 14, CW, size=11.8, color=MUTED)
    C.setFont('Noto', 8); C.setFillColor(MUTED)
    C.drawString(M, 29, 'visdar.fr  /  Android  /  guide invité')
    C.drawRightString(W - M, 29, f'{PAGE:02d} / {TOTAL:02d}')
    return end

def note(title, text, top, warning=False, height=92):
    fill, stroke, fg = (AMBER_BG, HexColor('#eed7ad'), AMBER) if warning else (LILAC, LINE, PURPLE)
    box(M, top, CW, height, fill=fill, stroke=stroke)
    y = para(title, M + 16, top + 12, CW - 32, size=11.2, color=fg, bold=True)
    para(text, M + 16, y + 5, CW - 32, size=10.5)

def button(label, url, x, top, width=245, height=35):
    box(x, top, width, height, fill=white, stroke=HexColor('#bca8e6'), radius=height / 2)
    C.setFillColor(PURPLE); C.setFont('NotoB', 9.7); C.drawCentredString(x + width / 2, H - top - height / 2 - 3, label)
    C.linkURL(url, (x, H - top - height, x + width, H - top), relative=0, thickness=0)

def image_block(path, top, width, caption, max_height=390):
    im = Image.open(path); iw, ih = im.size
    height = width * ih / iw
    if height > max_height:
        height = max_height; width = height * iw / ih
    x = (W - width) / 2
    box(x - 5, top - 5, width + 10, height + 10, fill=white, stroke=LINE, radius=10)
    C.drawImage(str(path), x, H - top - height, width, height, mask='auto', preserveAspectRatio=True)
    return para(caption, x, top + height + 13, width, size=8.5, color=MUTED)

def end_page():
    C.showPage()

def linked(text, url):
    return f'<link href="{escape(url)}" color="#6a49b8"><u>{escape(text)}</u></link>'

# 1. Cover and promise.
header('Guide illustré / accès invité', 'Tester spécial invité', 'Installer une application Android Visd AR gratuitement avec une carte de test Google Play : sans carte bancaire réelle et sans code promotionnel.')
box(M, 255, CW, 105, fill=HexColor('#e9f7f1'), stroke=HexColor('#bfe4d4'))
para('INSTALLATION GRATUITE', M + 20, 273, CW - 40, size=18, color=GREEN, bold=True)
para('La commande Google Play est un test : aucun montant ne sera débité.', M + 20, 306, CW - 40, size=12)
para('Ce parcours est prévu pour les personnes invitées au test fermé. Les noms de boutons peuvent varier selon la langue et l’appareil.', M, 395, CW, size=11.5)
for n, title, text in [
    ('01', 'Rejoindre le groupe', 'Utilisez le compte Google actif dans le Play Store.'),
    ('02', 'Choisir une application', 'Sélectionnez une ou plusieurs applications à tester.'),
    ('03', 'Installer avec la carte de test', 'Choisissez « Test card, always approves », puis le téléphone cible.'),
]:
    y = 470 + (int(n) - 1) * 72
    box(M, y, CW, 57, fill=white)
    para(n, M + 15, y + 14, 40, size=17, color=PURPLE, bold=True)
    para(title, M + 70, y + 10, CW - 90, size=11.5, bold=True)
    para(text, M + 70, y + 30, CW - 90, size=9.8, color=MUTED)
note('Règle essentielle', 'N’ajoutez pas de carte bancaire réelle et ne confirmez jamais une somme. La carte affichée dans ce guide est une carte de test Google Play.', 708, warning=True, height=86)
end_page()

# 2. Prerequisites.
header('Avant de commencer', 'Le même compte Google à chaque étape', 'Le compte utilisé sur la page de test doit être celui qui est connecté au Play Store du téléphone ou de l’ordinateur.')
steps = [
    ('1', 'Rejoignez le groupe Visd AR', 'Ouvrez le lien d’invitation et acceptez l’adhésion avec votre compte Google Play.'),
    ('2', 'Ouvrez la page de test', 'Pour chaque application souhaitée, confirmez votre participation au test fermé.'),
    ('3', 'Ouvrez le lien Google Play', 'La fiche peut encore afficher un prix : cela ne signifie pas que vous devez payer.'),
]
y = 260
for num, title, text in steps:
    box(M, y, CW, 92, fill=white)
    C.setFillColor(PURPLE); C.circle(M + 27, H - y - 29, 14, fill=1, stroke=0)
    C.setFillColor(white); C.setFont('NotoB', 11); C.drawCentredString(M + 27, H - y - 33, num)
    z = para(title, M + 57, y + 13, CW - 75, size=12.2, bold=True)
    para(text, M + 57, z + 5, CW - 75, size=10.6)
    y += 108
button('Rejoindre le groupe Visd AR', 'https://groups.google.com/g/visdar', M, 603, 249)
button('Ouvrir les demandes de test', 'https://www.visdar.fr/tests-google-play', M + 264, 603, 245)
note('Aucun code promo nécessaire', 'Ce guide utilise la carte de test Google Play. Vous n’avez pas besoin d’échanger un code promotionnel pour suivre ce parcours invité.', 674, warning=True, height=95)
end_page()

# 3. Payment method screenshot.
header('Étape 3 / carte de test', 'Sélectionnez la carte de test', 'Dans les modes de paiement Google Play, choisissez « Test card, always approves », la carte qui approuve toujours les commandes de test.')
bottom = image_block(payment_image, 235, 455, 'Capture anonymisée : l’adresse du compte est masquée. Les moyens de paiement visibles sont ceux de l’environnement de test Google Play.')
para('<b>3.</b> Dans « Payment methods », choisissez <b>Test card, always approves</b>. Ne sélectionnez pas une carte bancaire réelle, PayPal ou un autre moyen de paiement.', M, bottom + 22, CW, size=11.5)
note('Ce n’est pas une carte bancaire', 'La carte de test sert uniquement à simuler une commande Google Play. Elle est conçue pour approuver le test sans débit réel.', 683, warning=True, height=93)
end_page()

# 4. Checkout.
header('Étape 2 / confirmation', 'Vérifiez le message « test order »', 'Après le choix de l’appareil, Google Play peut afficher cette fenêtre de confirmation avant de vous laisser choisir le moyen de paiement de test.')
bottom = image_block(source_checkout, 245, 445, 'Capture fournie par Visd AR : Google Play précise « This is a test order, you will not be charged ».')
para('<b>2.</b> Vérifiez que le moyen de paiement est bien la carte de test et que le message indique que vous ne serez pas débité. Cliquez ensuite sur <b>Buy</b> pour terminer la simulation.', M, bottom + 23, CW, size=11.5)
note('Si Google affiche encore un montant', 'Arrêtez-vous et ne confirmez pas. Revenez aux modes de paiement, sélectionnez la carte de test, ou contactez visdar@outlook.fr.', 704, warning=True, height=91)
end_page()

# 5. Device selection/install.
header('Étape 1 / installation', 'Choisissez le téléphone à installer', 'Depuis un téléphone ou un ordinateur, Google Play peut proposer plusieurs appareils associés à votre compte.')
bottom = image_block(source_install, 230, 545, 'Capture fournie par Visd AR : choisissez l’appareil cible, puis appuyez sur « Install ».')
para('<b>1.</b> Sélectionnez le téléphone ou la tablette souhaité(e). Vous pouvez effectuer cette étape sur ordinateur pour lancer l’installation sur votre mobile.', M, bottom + 18, CW, size=11.4)
para('<b>2.</b> Appuyez sur <b>Install</b>. Sur le téléphone, ouvrez ensuite le Play Store et attendez la fin du téléchargement. Appuyez sur <b>Open</b> pour lancer l’application.', M, bottom + 70, CW, size=11.4)
note('Téléphone absent de la liste ?', 'Ouvrez le Play Store sur ce téléphone avec le même compte Google, vérifiez la connexion Internet et réessayez.', 689, height=83)
end_page()

# 6. troubleshooting and support.
header('Après l’installation', 'En cas de blocage', 'Le parcours est gratuit. Aucun achat ne doit être effectué pour participer au test.')
rows = [
    ('La fiche reste payante', 'Vérifiez que la carte de test est sélectionnée et que Google affiche « test order ».'),
    ('L’application n’est pas disponible', 'Vérifiez l’adhésion au groupe et la confirmation de la page de test avec le même compte Google.'),
    ('L’installation ne démarre pas', 'Vérifiez l’espace disponible, la connexion et l’appareil choisi. Essayez depuis le Play Store du téléphone.'),
]
y = 257
for title, text in rows:
    y = para(title, M, y, CW, size=12.2, bold=True)
    y = para(text, M, y + 5, CW, size=10.8) + 17
    line(M, y - 8, W - M, y - 8)
note('Besoin d’aide ?', 'Écrivez à visdar@outlook.fr en indiquant le nom de l’application et le message affiché. Ne transmettez jamais une carte bancaire ni un mot de passe.', 620, warning=False, height=106)
para('Le traitement des demandes de test peut prendre jusqu’à 48 heures. Les écrans Google Play peuvent évoluer.', M, 752, CW, size=9.2, color=MUTED)
end_page()

# 7. Linked directory, only in this tester guide.
header('Annexe / liens du testeur', 'Applications Visd AR à tester', 'Chaque nom ouvre directement la fiche Google Play correspondante. Le lien du dictionnaire contextuel sera ajouté dès sa publication.')
apps = [
    ('Calendrier lunisolaire et signes astrologiques chinois', 'com.visdar.calendrier', 'https://play.google.com/store/apps/details?id=com.visdar.calendrier'),
    ('Reconnaissance des sinogrammes manuscrits', 'com.visdar.manuscrits', 'https://play.google.com/store/apps/details?id=com.visdar.manuscrits'),
    ('Pays en chinois : capitale, heure, monnaie, indicatif téléphonique', 'com.visdar.heures', 'https://play.google.com/store/apps/details?id=com.visdar.heures'),
    ('Dictionnaire contextuel français-chinois', 'Lien Google Play à venir', None),
    ('Grands nombres en chinois', 'com.visdar.chiffres', 'https://play.google.com/store/apps/details?id=com.visdar.chiffres'),
    ('Roue des couleurs en chinois', 'com.visdar.couleurs', 'https://play.google.com/store/apps/details?id=com.visdar.couleurs'),
    ('Clés des sinogrammes (avec exemples)', 'com.visdar.cles', 'https://play.google.com/store/apps/details?id=com.visdar.cles'),
    ('Dialectes et langues régionales en Chine', 'com.visdar.dialectes', 'https://play.google.com/store/apps/details?id=com.visdar.dialectes'),
    ('Classificateurs chinois', 'com.visdar.classificateur', 'https://play.google.com/store/apps/details?id=com.visdar.classificateur'),
    ('Exprimer le temps en chinois', 'com.visdar.temps', 'https://play.google.com/store/apps/details?id=com.visdar.temps'),
    ('Locutions idiomatiques Chengyu', 'com.visdar.expressions', 'https://play.google.com/store/apps/details?id=com.visdar.expressions'),
    ('Liens de parenté', 'com.visdar.famille', 'https://play.google.com/store/apps/details?id=com.visdar.famille'),
]
y = 235
for title, package, url in apps:
    box(M, y, CW, 34, fill=white, stroke=LINE, radius=10)
    title_html = linked(title, url) if url else f'<b>{escape(title)}</b>'
    para(title_html, M + 12, y + 5, CW - 24, size=8.9, color=PURPLE if url else INK)
    package_html = linked(package, url) if url else f'<font color="#805213">{escape(package)}</font>'
    para(package_html, M + 12, y + 20, CW - 24, size=7.2, color=MUTED)
    y += 39
note('Lien en attente', 'Le lien Google Play de « Dictionnaire contextuel français-chinois » n’est pas encore fourni. Il sera ajouté ici sans modifier les autres pages du site.', 722, height=66)
end_page()

assert PAGE == TOTAL
C.save()
# The intended reading order mirrors the earlier installation guide: device first,
# then the test-order confirmation, then the virtual test card in payment methods.
reader = PdfReader(str(OUT))
writer = PdfWriter()
for index in (0, 1, 4, 3, 2, 5, 6):
    writer.add_page(reader.pages[index])
for key, value in reader.metadata.items():
    if key and value:
        writer.add_metadata({str(key): str(value)})
with OUT.open('wb') as handle:
    writer.write(handle)
# Reordering the two illustrated pages also requires correcting their printed footer numbers.
reader = PdfReader(str(OUT))
writer = PdfWriter()
for index, page in enumerate(reader.pages):
    if index in (2, 3, 4):
        overlay_buffer = BytesIO()
        overlay = canvas.Canvas(overlay_buffer, pagesize=(W, H))
        overlay.setFillColor(HexColor('#fdfcfe')); overlay.rect(W - M - 48, 15, 48, 20, fill=1, stroke=0)
        overlay.setFillColor(MUTED); overlay.setFont('Noto', 8)
        overlay.drawRightString(W - M, 22, f'{index + 1:02d} / {TOTAL:02d}')
        overlay.save(); overlay_buffer.seek(0)
        from pypdf import PdfReader as OverlayReader
        page.merge_page(OverlayReader(overlay_buffer).pages[0])
    writer.add_page(page)
for key, value in reader.metadata.items():
    if key and value:
        writer.add_metadata({str(key): str(value)})
with OUT.open('wb') as handle:
    writer.write(handle)
print(f'Created {OUT} ({PAGE} pages)')
