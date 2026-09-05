from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path('/Volumes/Seagate1TB/BookSite')
OUT = ROOT / 'public/guides/guide-tester-special-invite.pdf'
PUBLIC = ROOT / 'public/guides'
TMP = ROOT / 'tmp/pdfs/special-guest-v2'
TMP.mkdir(parents=True, exist_ok=True)
FONT_DIR = Path('/Users/ding/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype')
pdfmetrics.registerFont(TTFont('Noto', str(FONT_DIR / 'NotoSans-Regular.ttf')))
pdfmetrics.registerFont(TTFont('NotoB', str(FONT_DIR / 'NotoSans-Bold.ttf')))

W, H, M = 595.28, 841.89, 43
CW = W - 2 * M
INK, MUTED, PURPLE = HexColor('#252241'), HexColor('#68647c'), HexColor('#6a49b8')
LILAC, LINE, GREEN = HexColor('#f1edfc'), HexColor('#ddd4ef'), HexColor('#147c67')
AMBER, AMBER_BG = HexColor('#805213'), HexColor('#fff6e5')
TOTAL, PAGE = 7, 0

SOURCES = {
    'device_a': Path('/Users/ding/Desktop/截屏2026-09-05 01.18.19.png'),
    'device_b': Path('/Users/ding/Desktop/截屏2026-09-05 01.18.38.png'),
    'agree': Path('/Users/ding/Desktop/截屏2026-09-05 01.18.45.png'),
    'checkout': Path('/Users/ding/Desktop/截屏2026-09-05 01.18.53.png'),
    'verify': Path('/Users/ding/Desktop/截屏2026-09-05 01.19.01.png'),
}

def image_font(size=22):
    return ImageFont.truetype(str(FONT_DIR / 'NotoSans-Bold.ttf'), size)

def mark(draw, area, label):
    x1, y1, x2, y2 = area
    draw.rounded_rectangle(area, radius=10, outline='#6a49b8', width=6)
    draw.ellipse((x1 - 18, y1 - 18, x1 + 18, y1 + 18), fill='#6a49b8')
    draw.text((x1 - 7, y1 - 14), label, font=image_font(20), fill='white')

def output_image(name):
    return PUBLIC / f'tester-{name}.png'

def prepare_images():
    # Device names and last-use dates are personal. Replace them while preserving the selector.
    primary = Image.open(SOURCES['device_a']).convert('RGB')
    draw = ImageDraw.Draw(primary)
    draw.rounded_rectangle((520, 312, 820, 372), radius=8, fill='white')
    draw.text((545, 321), 'Votre appareil Android', font=image_font(22), fill='#252241')
    mark(draw, (452, 305, 1132, 375), '1')
    primary.save(output_image('device-choice'), optimize=True)

    alternative = Image.open(SOURCES['device_b']).convert('RGB')
    draw = ImageDraw.Draw(alternative)
    draw.rounded_rectangle((205, 290, 450, 350), radius=8, fill='white')
    draw.text((220, 301), 'Autre appareil Android', font=image_font(17), fill='#252241')
    mark(draw, (138, 284, 818, 354), '2')
    alternative.save(output_image('device-alternative'), optimize=True)

    agree = Image.open(SOURCES['agree']).convert('RGB')
    draw = ImageDraw.Draw(agree); mark(draw, (640, 318, 827, 368), '3')
    agree.save(output_image('agree'), optimize=True)

    checkout = Image.open(SOURCES['checkout']).convert('RGB')
    draw = ImageDraw.Draw(checkout)
    mark(draw, (125, 198, 735, 278), '4')
    mark(draw, (526, 476, 713, 526), '5')
    checkout.save(output_image('test-card-buy'), optimize=True)

    verify = Image.open(SOURCES['verify']).convert('RGB')
    draw = ImageDraw.Draw(verify); mark(draw, (465, 330, 525, 366), '6')
    verify.save(output_image('two-factor'), optimize=True)

prepare_images()

C = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
C.setTitle('Visd AR | Tester spécial invité - Installation Android gratuite')
C.setAuthor('Visd AR')
C.setSubject('Guide illustré Google Play : appareil, validation, carte de test et double authentification.')
C.setCreator('Visd AR')

def para(text, x, top, width=CW, size=11.4, color=INK, bold=False, leading=None):
    style = ParagraphStyle('guide', fontName='NotoB' if bold else 'Noto', fontSize=size, leading=leading or size * 1.45, textColor=color)
    paragraph = Paragraph(text, style)
    _, height = paragraph.wrap(width, H)
    paragraph.drawOn(C, x, H - top - height)
    return top + height

def box(x, top, width, height, fill=LILAC, stroke=LINE, radius=16):
    C.setFillColor(fill); C.setStrokeColor(stroke); C.setLineWidth(.65)
    C.roundRect(x, H - top - height, width, height, radius, fill=1, stroke=1)

def header(kicker, title, subtitle):
    global PAGE
    PAGE += 1
    C.setFillColor(HexColor('#fdfcfe')); C.rect(0, 0, W, H, fill=1, stroke=0)
    C.saveState(); C.setFillAlpha(.55); C.setFillColor(HexColor('#e8e0fa')); C.circle(W - 2, H - 20, 95, fill=1, stroke=0)
    C.setFillColor(HexColor('#e5f7f9')); C.circle(W - 100, H + 30, 100, fill=1, stroke=0); C.restoreState()
    C.drawImage(str(ROOT / 'public/images/logo.png'), M, H - 62, 28, 28, mask='auto')
    para('Visd AR', M + 37, 32, 180, size=13, bold=True)
    para('TESTER SPÉCIAL INVITÉ', W - 205, 37, 162, size=8.2, color=MUTED, bold=True)
    C.setStrokeColor(LINE); C.line(M, H - 78, W - M, H - 78)
    para(kicker.upper(), M, 96, CW, size=9.5, color=PURPLE, bold=True)
    end = para(title, M, 118, CW, size=24.5, bold=True, leading=31)
    para(subtitle, M, end + 13, CW, size=11.5, color=MUTED)
    C.setFillColor(MUTED); C.setFont('Noto', 8); C.drawString(M, 29, 'visdar.fr  •  Android  •  guide invité')
    C.drawRightString(W - M, 29, f'{PAGE:02d} · {TOTAL:02d}')

def note(title, text, top, warning=False, height=88):
    fill, stroke, fg = (AMBER_BG, HexColor('#eed7ad'), AMBER) if warning else (LILAC, LINE, PURPLE)
    box(M, top, CW, height, fill, stroke)
    y = para(title, M + 16, top + 12, CW - 32, size=11.1, color=fg, bold=True)
    para(text, M + 16, y + 5, CW - 32, size=10.35)

def image_block(path, top, width, caption, maximum=390):
    image = Image.open(path); image_width, image_height = image.size
    height = width * image_height / image_width
    if height > maximum:
        height, width = maximum, maximum * image_width / image_height
    x = (W - width) / 2
    box(x - 5, top - 5, width + 10, height + 10, white, LINE, 10)
    C.drawImage(str(path), x, H - top - height, width, height, mask='auto')
    return para(caption, x, top + height + 12, width, size=8.3, color=MUTED)

def end_page():
    C.showPage()

header('Avant le téléchargement', 'Bienvenue', 'Pendant la phase de test, toute application Android Visd AR proposée au test est <i>gratuite</i> pour les testeurs invités, même si Google Play affiche un prix.')
note('Google Play Pass : choisissez « Non merci »', 'Cette offre d’abonnement payant de Google est facultative et distincte du test Visd AR. Si elle apparaît après la carte de test, refusez-la avec le bouton en bas à gauche, puis revenez installer l’application.', 202, warning=True, height=90)
note('Accès à la phase de test', 'Pour activer votre accès, communiquez à visdar@outlook.fr l’adresse du compte Google utilisé dans le Play Store. La commande avec la carte de test ne débite aucun montant.', 305, height=83)
box(M, 402, CW, 162, white, LINE)
para('1. Compte Google', M + 20, 422, CW - 40, size=13, bold=True)
para('Vérifiez que le bon compte Gmail est actif dans le Play Store. Sur ordinateur, vérifiez l’avatar Google en haut de la page ; sur téléphone, ouvrez le Play Store avec ce même compte.', M + 20, 450, CW - 40, size=10.7)
para('2. Prix de l’application', M + 20, 506, CW - 40, size=13, bold=True)
para('Cliquez sur le prix ou sur « Buy » : il sert seulement à ouvrir Google Play. Pour les testeurs invités, ce prix n’est pas débité.', M + 20, 534, CW - 40, size=10.7)
note('Confidentialité', 'Votre adresse Gmail sert uniquement à gérer votre accès au test. Pour quitter le test, demandez son retrait à visdar@outlook.fr. Ne transmettez jamais un mot de passe, un code de sécurité ou des données bancaires.', 604, height=105)
end_page()

header('Étape 1 · appareil', 'Choisissez le téléphone à installer', 'Après avoir cliqué sur le prix, choisissez le téléphone ou la tablette cible. Les noms et les dernières dates d’utilisation ont été masqués dans ces captures.')
bottom = image_block(output_image('device-choice'), 230, 475, '1. Ouvrez le menu « Choose a device » et sélectionnez votre appareil Android.', 230)
bottom = image_block(output_image('device-alternative'), bottom + 14, 365, '2. Si plusieurs appareils sont proposés, choisissez celui sur lequel vous souhaitez installer l’application.', 185)
para('Cliquez ensuite sur <b>Install</b>. Depuis un ordinateur, cette action lance le téléchargement sur le téléphone choisi.', M, bottom + 14, CW, size=10.3)
end_page()

header('Étape 2 · conditions', 'Acceptez les conditions Google Play', 'Google Play peut afficher une fenêtre « Review and agree ». Elle dépend du compte et peut ne s’afficher qu’une seule fois.')
bottom = image_block(output_image('agree'), 245, 505, '3. Lisez les conditions, puis cliquez sur « Agree » pour poursuivre le téléchargement de test.', 300)
note('Le mot « Agree » n’est pas un achat', 'Il sert à accepter les conditions de fourniture numérique de Google Play. Cette étape ne remplace pas le choix obligatoire de la carte de test à la page suivante.', bottom + 28, height=92)
end_page()

header('Étape 3 · paiement de test', 'Choisissez la carte virtuelle et cliquez sur Buy', 'Dans la fenêtre de paiement, vérifiez d’abord le message « This is a test order, you will not be charged ».')
bottom = image_block(output_image('test-card-buy'), 300, 435, '4. Le moyen de paiement doit être « Test card, always approves ». 5. Cliquez sur « Buy » pour confirmer la commande de test.', 300)
note('Ne choisissez jamais votre carte', 'Si le moyen affiché est une carte bancaire, PayPal ou tout autre paiement personnel, annulez et revenez au choix de paiement. Aucune carte réelle n’est nécessaire.', bottom + 16, warning=True, height=92)
end_page()

header('Après la carte de test · offre facultative', 'Google Play Pass : refusez l’offre', 'Ce panneau propose un abonnement Google distinct de l’application Visd AR. Il n’est pas nécessaire pour installer votre application de test.')
pass_width, pass_top = 380, 225
pass_height = pass_width * 2400 / 1080
panel_height = pass_height * .445
pass_x = 160
panel_bottom = H - pass_top - panel_height
# Magnify the original popup with a vector clipping path, preserving the screenshot.
C.saveState()
clip = C.beginPath(); clip.rect(pass_x, panel_bottom, pass_width, panel_height)
C.clipPath(clip, stroke=0, fill=0)
C.drawImage(str(PUBLIC / 'tester-play-pass.jpg'), pass_x, panel_bottom, pass_width, pass_height)
C.restoreState()
C.setStrokeColor(HexColor('#d92332')); C.setLineWidth(3.5)
C.ellipse(pass_x + pass_width * .008, panel_bottom - pass_height * .006, pass_x + pass_width * .505, panel_bottom + pass_height * .087, fill=0, stroke=1)
arrow_y = panel_bottom + pass_height * .0405
arrow_tip = pass_x + pass_width * .008 - 4
C.line(135, arrow_y, arrow_tip, arrow_y)
C.line(arrow_tip, arrow_y, arrow_tip - 6, arrow_y + 4)
C.line(arrow_tip, arrow_y, arrow_tip - 6, arrow_y - 4)
para('Cliquez pour refuser.<br/>Cela n’empêche pas le téléchargement.', M, H - arrow_y - 35, 88, size=10.5, bold=True, color=HexColor('#d92332'))
note('Refuser, puis continuer l’installation', 'Cliquez sur « Non merci », en bas à gauche du panneau Google Play Pass. Ne choisissez pas le bouton bleu de droite. Revenez à la fiche Visd AR et cliquez sur « Installer » si nécessaire. Ne cliquez pas sur « Rembourser » dans la fiche de l’application.', 716, warning=True, height=87)
end_page()

header('Étape 4 · sécurité Google', 'Validez la double authentification si elle apparaît', 'Selon la sécurité de votre compte Google, une vérification supplémentaire peut être demandée avant que le téléchargement démarre.')
bottom = image_block(output_image('two-factor'), 250, 375, '6. Suivez la méthode proposée par Google, par exemple un QR code ou une clé d’accès, puis cliquez sur « Continuer ».')
note('Après la vérification', 'Google Play lance l’installation sur l’appareil choisi. Pour toute question, écrivez à visdar@outlook.fr. N’envoyez jamais de mot de passe, de code de sécurité ou de données bancaires.', bottom + 20, height=104)
end_page()

header('Annexe · liens du testeur', 'Applications Visd AR à tester', 'Chaque bouton ouvre directement sa fiche Google Play.')
apps = [
    ('Calendrier lunisolaire et signes astrologiques chinois', 'com.visdar.calendrier', 'https://play.google.com/store/apps/details?id=com.visdar.calendrier'),
    ('Reconnaissance des sinogrammes manuscrits', 'com.visdar.manuscrits', 'https://play.google.com/store/apps/details?id=com.visdar.manuscrits'),
    ('Pays en chinois : capitale, heure, monnaie, indicatif téléphonique', 'com.visdar.heures', 'https://play.google.com/store/apps/details?id=com.visdar.heures'),
    ('Dictionnaire contextuel français-chinois', 'com.visdar.contextes', 'https://play.google.com/store/apps/details?id=com.visdar.contextes'),
    ('Grands nombres en chinois', 'com.visdar.chiffres', 'https://play.google.com/store/apps/details?id=com.visdar.chiffres'),
    ('Roue des couleurs en chinois', 'com.visdar.couleurs', 'https://play.google.com/store/apps/details?id=com.visdar.couleurs'),
    ('Clés des sinogrammes (avec exemples)', 'com.visdar.cles', 'https://play.google.com/store/apps/details?id=com.visdar.cles'),
    ('Dialectes et langues régionales en Chine', 'com.visdar.dialectes', 'https://play.google.com/store/apps/details?id=com.visdar.dialectes'),
    ('Classificateurs chinois', 'com.visdar.classificateur', 'https://play.google.com/store/apps/details?id=com.visdar.classificateur'),
    ('Exprimer le temps en chinois', 'com.visdar.temps', 'https://play.google.com/store/apps/details?id=com.visdar.temps'),
    ('Locutions idiomatiques Chengyu', 'com.visdar.expressions', 'https://play.google.com/store/apps/details?id=com.visdar.expressions'),
    ('Liens de parenté', 'com.visdar.famille', 'https://play.google.com/store/apps/details?id=com.visdar.famille'),
]
top = 205
for title, package, url in apps:
    C.saveState()
    C.setFillAlpha(.35)
    C.setFillColor(HexColor('#ddd6eb'))
    C.roundRect(M + 1, H - top - 50, CW, 48, 12, fill=1, stroke=0)
    C.restoreState()
    box(M, top, CW, 48, HexColor('#ffffff'), HexColor('#e8e1f5'), 12)
    C.saveState()
    C.setFillAlpha(.65)
    C.setFillColor(HexColor('#a995df'))
    C.roundRect(M, H - top - 48, 2, 48, 1, fill=1, stroke=0)
    C.restoreState()
    title_text = f'<link href="{escape(url)}" color="#252241"><b>{escape(title)}</b></link>'
    para(title_text, M + 18, top + 7, CW - 36, size=10.8, color=INK)
    url_text = f'<link href="{escape(url)}" color="#6a49b8"><u>{escape(url)}</u></link>'
    para(url_text, M + 18, top + 28, CW - 36, size=7.5, color=MUTED)
    C.linkURL(url, (M, H - top - 48, M + CW, H - top), relative=0)
    top += 50
end_page()

assert PAGE == TOTAL
C.save()
print(f'Created {OUT} ({PAGE} pages)')
