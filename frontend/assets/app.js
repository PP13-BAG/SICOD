function formatPSDateTime(ps){
  const date = ps && ps.date ? String(ps.date) : '';
  const time = ps && ps.time ? String(ps.time) : '';
  return [date, time].filter(Boolean).join(' ') || 'â€”';
}

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function slugify(str){
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]+/g, '')
    .replace(/-+/g, '-');
}

function isLikelyFilePath(src){
  return /^(file:|[a-zA-Z]:\\|\.\.\/|\.\/|[^:]+\.(png|jpg|jpeg|webp|gif|svg)$)/i.test(String(src || ''));
}

// ============================================================
// SICOD â€” Script principal consolidÃ©
// Version : refactorÃ©e â€” aucune fonctionnalitÃ© supprimÃ©e
// Charte graphique : conservÃ©e intÃ©gralement
//
// ARCHITECTURE :
//   1. Constantes de donnÃ©es (logoBase64, reflexLibrary, commandTypes)
//   2. Couche Storage (isolÃ©e â€” synchronisation Supabase)
//   3. Ã‰tat applicatif (state) â€” unique, initialisÃ© une seule fois
//   4. Utilitaires globaux
//   5. Modules par page (Dashboard, Ã‰vÃ©nements, PS, Command, Fiches,
//      Annuaire, Outils, Planning, Astreintes, ParamÃ¨tres)
//   6. Bootstrap (init, renderAll, intervalles)
//
// CIBLE ACTUELLE â€” points documentÃ©s :
//   [SB-STORAGE] : synchronisation vers Supabase
//   [SB-AUTH]    : authentification utilisateur via Supabase Auth
//   [GH-PAGES]   : publication du frontend statique via GitHub Pages
// ============================================================

'use strict';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1. CONSTANTES DE DONNÃ‰ES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAggAAABaCAIAAABSRznhAAAQKUlEQVR4nO3df0wT5x8H8GsLtPJTQUEnAhZ0cYhV6Bg4cNNhgKkoRnRTmW4zhqngj5kNcUQTWQrEFYmEzUWjzl9zMJGoCFMIgajohqyCX0SLFkUNKoMJFEqBfv+4fO97V6C9QhFK36+/+tw9z3PP84neh95zveNoNBoCAADgf7jDPQAAABhZkBgAAIABiQEAABiQGAAAgAGJAQAAGJAYAACAAYkBAAAYkBgAAIABiQEAABiQGAAAgAGJAQAAGJAYAACAAYkBAAAYkBgAAIABiWHILV++nMPhcLnclJSU4R4LAIB+FsM9gFFu//79OTk5FhYWR44c+eyzz4Z7OAAA+nHwop6hU1paumDBAj6fn52dHRYWNtzDAQBgRU9i4HhlGtSdvCDUoPrjlkQbVJ8gCMf/XDe0CQAAsGf8NQZPQxj96H0Si8WcvtjZ2U2bNu3TTz/Nzc3tnSD7bGVlZeXo6CgWi+Pi4v7++2/2x6I7duzYgOsPrAmlsLAwNjbW19fXxcXFysrK1tbWy8srMjIyMzPz1atXZB0PDw+9/dMVFxdrjar316OysjJ6k/z8/DcfagBgyawXn1tbW+Vy+a+//rps2bIFCxY0NTXpbaJWq5uamsrLyw8ePOjr65uUlPQGxmkUMplMLBaHhIRkZGRUVFS8ePFCrVa3tbXV1taeP39+8+bNrq6uzc3Nwz3M/zPdUAOYOrNODHTFxcXLly83qIlGo0lMTCwpKRmiIRlRbm5uYGBgeXm5jjoqlaqrq+uNDckgJhRqgFHA7BJDaGioRqPRaDStra1XrlwRCoXUruLi4qKiIh2turu7nzx5EhcXR9918uRJvcfSsn79eqPUZ9mkoqJi9erV7e3tZJHD4axfv/7GjRuvX79ubW2trKyUSCSTJk2i6isUCnpXWl+k0tLStI714Ycf9je8AXgzoQYAHcwuMVBsbGxCQkIOHTpE30heLu8Pl8t1dXVNS0tzdXWlNsrl8iEaobFs3bpVqVRSxcOHDx89ejQgIMDOzs7GxmbmzJnx8fG1tbVfffUVh8MZxnHSmWioAUYH800MJB8fH3qRWoDVgcvluru7U0Vra2vjD8t4bt26VVpaShVXrVr1xRdf9K42ZsyYzMxMJyenNzg0/Uwr1ACjhrknhsrKSnpx/Pjxepv09PQoFAqqOHPmTKOPyoguX75ML2pdnBnhTCvUAKOG+SYGpVJZWFgYExND36j7cnlPT099ff327dufPn1KbuHz+Zs2beqvfkFBQe8bKHXkHkPrs2ly584d6jOfz3/33Xd19DZyDHWoAUAHs3skBnkG6XPXvHnzFixYwL7V2LFjs7Ky3NzcjDxEo3r58iX1efz48ZaWlsM4GDZMN9QAo4bZJYb+BAUFnTt3jn39t99+Oz8/38PDY8hGZHwjZ23ZIKYYagCTZr6XkgiCsLa2FgqFK1eu/P3330tKSgxaeq2pqQkODn7w4IGOOn3eQ6ljfdvQ+myaTJgwgfr88uXLofulgkFZx6DKQxFqANDB7BID/QxC/u737Nmz5JOx9bZqamr68ccfqasx9fX1UVFR3d3db2TgAzRr1izqs0qlunXr1hAdiH7LUGdnp9ZelUpFL9ra2vbXj+mGGmDUMLvEMBhjx46NiYmRSCTUFplMdvjw4WEckl7h4eH0YkZGxhAdyMXFhfr85MkTrb2PHz+mF52dnXX3ZoqhBhg1kBgMFhsbS7+5XiKRjNgnSRAE4e/vHxwcTBXPnDnzyy+/9K7W3t6+efPmxsbGAR/ovffeoz7L5fL79+/T9168eJH67Ojo6OXlxaZP0wo1wKiBxGAwKyurHTt2UMW6urozZ84M43j0Sk9Pp1/nWb9+/YYNG27evNnW1qZUKquqqlJSUjw9PTMzMzWDeDlHVFQU/ZaniIiI4uLilpaWR48eJSQkZGVlUbtWr17Nco3B5EINMDogMQzEhg0b6CvVqampfZ5S+7y5nsPhrF271lgjYXOIOXPmnD59WiAQkEWNRnPkyJGAgABbW1sbGxsfH5/4+Pjnz58PciRubm47d+6kijU1NfPnz7e3txcKhRKJhIqPi4tLQkIC+25HTqgBzAcSw0BYW1vHxsZSxaqqqkuXLg3jePRaunRpWVmZr6+vjjp8Pt/CYlC3LyclJW3fvl1HBS8vr4KCAvoD+/QyuVADjAJIDAO0ZcsWGxsbqpicnDyMg2FDJBKVl5dfuXJl8+bNIpFo/PjxFhYW5A27y5Yty8jIqK+vHzt27GAOweVypVJpZWXltm3bxGKxo6OjhYWFjY2Nu7t7ZGTk0aNHKysrRSKRod2aXKgBTJ3xX+1p0HvZ/nlnrkH9E3i1JwDAEMM3BgAAYEBiAAAABiQGAABgQGIAAAAGJAYYhWprazds2BATE/P69evhHguA6UFigNGmtbU1IyMjISEhOjpaKpX29PQM94gATAzexwCjja2tbVpaGkEQQqHw/fffH+7hAJie0Z8YTpw4Qb6Bh8PhjBkzxtnZ2dvb++OPP37rrbd616HbtGnTwoUL1Wp1bm5uSUnJy5cvbWxspk+fvnjx4nfeeUfHgQiCsLKymjhxYnh4eFhYGFWhu7s7Ly+vqKjo2bNnPB7Pw8Nj0aJF9DNXUlJSc3Pz/v376d1u37590qRJ33zzDVnUaDRXr14tKiqqq6vTaDQTJ0708/NbvHgx+du0EydO5OXlaT1QKDU19fnz5+S50igzZRlVNtPpL4D29vZubm5RUVH0x4brnR2bIJNHEYlEe/fupTZKJJK2trakpCTdIeozFP3p6ur6888/CwsLKyoqZsyYQXauNVMejzdhwoSgoKAVK1bw+XyD+gcYOqM/MRAEIRAIyLOJUqmsq6vLzc3dtm3btm3b5s6d27uOloMHD8pksri4OG9vb5VKVVNTc/r06T179vT5jkyqk46OjtLS0szMTEtLy48++oggiO7u7u+///7Ro0cbN26cM2dOV1dXaWlpenq6XC5ft24dy4n09PSkpqbeu3dv3bp1fn5+fD6/pqbm+PHjDQ0NX3/9taHRGMxMCXZRNRTVZ2Nj47Fjx5KSkqRSqaurK8vmLIPM4XBkMlllZaWPj4/uYQzGrVu3SktLw8LCurq6tB4KGx0dHR0dTRCEWq2urq7+4YcfXrx4oftpIgBvknmtMVhbW8+YMSM+Pj4gIODgwYNsViZv3LgREhLi5+cnEAgcHBz8/f2TkpL0vjlZIBAsXLjQ09OzrKyM3HLhwoWKiopdu3YFBgYKBAJbW9vw8PAvv/zy/PnzMpmM5fgvXrz4119/7dmzh3w+HZ/PnzVrVnJysre3N8sedBjYTIkBRVUvJyendevWqdXqiooK9q1YBtnBwWH27NknT54c/Dh1mDt37rfffisWi7ncfv+XWVpazpo1a9GiRdevX8cTxWHkMK/EQFmxYkVHR8e1a9f01nRycqqurm5raxvYgagnjuTn54tEounTp9P3hoSEjBs3Lj8/n2VveXl5vr6+U6dOpW+0tLSkX7AasEHOlDAkquyp1Wr2ldkHee3atffv3x+699kZhMfjDeaB5wBGZ6aJYcqUKXw+X6FQ6K0ZExPz7Nmzzz///Lvvvjt27Njdu3fZ9N/R0VFYWPjw4cP58+cTBNHS0tLQ0ND7KVI8Hs/d3V3324wpZCdaZz0jGthM6dhHVa9//vnn+PHjfD4/MDCQZRODguzp6RkYGHjq1KnhPSN3dXVVV1fn5eUtXbp0kI+2BTAiM/23SC6ZKpVKaktHR0dkZCS9TkZGxuTJk2fPnn3o0KGqqqp79+5VVVXl5uaKxeL4+Hgej9e7W61OwsPDyfMa+Wd4n88uHTdu3L1799iMmeyE/pzRPvWeCEEQHh4eOioMYKZ96h1VQ9HHZm1tvW/fPq1ndOuYnaFBXrNmTVxcXElJyQcffKBjGCQyRFrVrly5kpmZ2ecuNlauXEl+H/L394+KihpADwBDxEwTg0ajUSqV9JOsjvVGPp/v5+fn5+dHEERJSUlaWlp+fv6iRYt616Q6UavVjx49OnDggFQq3blzJ3mg5ubm3k2ampqoYXA4fT/slnzfGVlN76We3hMh79sZzExlMhl1D4+/v/+uXbv6bK4VVd3T6bNPcmw9PT0KhSIlJeXs2bO7d++mv+5Nx+xYBpkyefLk+fPnnzlzJigoSGuXURaf9frtt9/UarVCofjpp592796dmprKPgcDDCkzvZT0+PHjzs5OrYv1bMybN8/BwUHvxR9LS8vp06dHRERcu3atoaHBzs7O2dm5trZWq1p3d3ddXd20adPIokAgaGlp0arz77//ki9fs7Ozc3Fx0XqX8tChz1QkEuX8T39ZgegVVd3T0dEnl8sVCoVbtmwpLy+/fp3tU9ZZBplu1apVjY2Nf/zxB8tDaFm4cGFOTs7Avi6QLC0tp02btnHjxocPH1ZVVQ24HwDjMtPEkJ2dLRAI2NxYqfWXY2dnp1KpHDNmDJujkH8vd3d3EwQRFhYmk8nkcjm9QlFRUVNTU2hoKFkUCoWNjY2NjY1UhYaGhubmZqFQSBbDw8Nv376tdRFfrVazX77WYTAzJWlFVe90dPPx8fH29s7OzmY/ADZBppswYUJoaGhWVpZKpWJ/FKPD/Ugw0phXYmhvb6+urk5JSbl58+bWrVvt7Oz0NsnJydm3b59cLler1U+fPk1LS+vp6SF/mqBDV1fXgwcPLly4MHXqVPIqeUREhEgkkkgkZWVlKpWqtbW1oKDg8OHDERERs2fPJluFhIQ4ODikp6c/fvxYpVIpFIr09HQnJydyBZsgiCVLlvj6+u7du7e4uLilpaWzs/POnTvx8fEDWCg21kyJ/qOqdzp6RUZGKhSK27dvs6zPJshaoqKi2tvb79y5w/IQRiGVSsvLy1+/ft3R0XH37t2ff/55ypQpRrnnGMAozGKNgVxL5HA4AoHA2dl55syZBw4coP9Gl+hrvXHFihVr1qxJTk7Oz8+XSqWvXr2yt7f39PSUSCReXl46DkQQBI/Hc3R09PX1/eSTT8hL5DweLzEx8dKlS2fPnpVKpeSPcrds2RIcHEw1t7Ozk0gkp06dSkxMbG1ttbe3F4lEO3bssLa2Jitwudz4+PirV69evnz50KFDBEG4uLiIxeI+Fzx0R2OQM2UTVb3T0cvPz8/d3f3cuXO631ZNYRNkLQ4ODkuWLMnKyuo9NfoWMkQsh016/vz5pk2bqCLZIblSvXz58uzs7IyMjI6ODicnp4CAANyVBCMKXu0JAAAM5nUpCQAA9EJiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgMP67QXq/dFeHcUY/PAAADI6eF/UAAIC5waUkAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAIb/AoVykzuG5rK2AAAAAElFTkSuQmCC";
const reflexLibrary = {"fiches": [{"code": "2.A", "title": "Feux de forÃªt", "family": "Risques naturels", "sections": [{"heading": "SynthÃ¨se", "items": ["EvÃ©nement concernÃ©", "Feu de forÃªt impliquant la mise en Å“uvre de moyens de secours importants avec enjeux humains et/ou Ã©conomiques (infrastructures)."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM", "Evaluation : oÃ¹ - quand - quoi - moyens- enjeux ? cf. verso"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision du PREFET"]}, {"heading": "Direction des opÃ©rations", "items": ["Activation dâ€™une cellule de suivi ou du COD sur dÃ©cision de l'autoritÃ© prÃ©fectorale."]}, {"heading": "PremiÃ¨res questions Ã  poser Ã  lâ€™appel du CODIS ou du COSSIM", "items": ["OÃ¹ et quand, prÃ©cisÃ©ment, le FEU DE FORET sâ€™est-il produit ?", "Quelles sont Ã  ce stade, vos difficultÃ©s ?", "Qui est le COS ? (commandant des opÃ©rations de secours)", "Quelle est lâ€™autoritÃ© de police ou de gendarmerie avec laquelle vous Ãªtes en contact ?", "Y-a-t-il des victimes ?", "Si oui, combien et identitÃ© des victimes ?", "Ces victimes sont-elles sur le terrain ?", "Un PMA (Poste mÃ©dical avancÃ©) a-t-il Ã©tÃ© mis en place ?", "Le procureur a â€“t-il Ã©tÃ© averti ?", "Y-a-t-il des habitations menacÃ©es ?", "Si oui, - quel est le village menacÃ© et dans quel dÃ©lai ?", "quelles sont les mesures prises ? qui avez-vous alertÃ© ? (le maire, le dÃ©putÃ©, le CD13, la GGD,...)", "lâ€™Ã©vacuation des habitations doit-elle Ãªtre envisagÃ©e ?", "quelles sont les solutions dâ€™hÃ©bergement provisoire dÃ©jÃ  Ã  lâ€™Ã©tude ?", "Quels sont les moyens engagÃ©s (terrestres, aÃ©riens) ?", "Avez-vous demandÃ© des renforcements au BMPM ou au SDIS ?", "Si oui lesquels ? Les avez-vous obtenus ? dans quels dÃ©lais ?", "Avez-vous demandÃ© des renforcements extra-dÃ©partementaux Ã  lâ€™EMIZDS?", "Si oui lesquels ? (colonnes de renfort, moyens aÃ©riens BASC)", "Les avez-vous obtenus ? dans quels dÃ©lais ?", "A ce stade, avez-vous prÃ©venu la presse ?", "Quelle est lâ€™Ã©volution probable de la situation (mÃ©tÃ©orologie, â€¦) ?"]}, {"heading": "Sur le terrain", "items": ["Lâ€™autoritÃ© prÃ©fectorale sâ€™adresse au COS :", "Quelle est la stratÃ©gie de lutte contre le feu de forÃªt mise en Å“uvre ?", "Comment avez-vous sectorisÃ© votre dispositif ?", "Comment avez-vous organisÃ© votre PC, vos relÃ¨ves (commandement, groupes dâ€™intervention, â€¦..) ?", "Envisagez-vous un dÃ©placement de votre PC ? si oui, quand ?", "OÃ¹ sont fixÃ©s (sur le terrain et sur la carte) les points de transit pour lâ€™accueil des colonnes de renfort ?", "Quels sont les Ã©lus prÃ©sents sur le terrain ?", "OÃ¹ les regroupez-vous dans votre PC pour les tenir informÃ©s ?", "Un 1er briefing, Ã  leur intention, a-t-il dÃ©jÃ  Ã©tÃ© fait ?", "Quels sont les organes de presse prÃ©sents ?", "OÃ¹ est la zone presse ?", "Un point presse a-t-il dÃ©jÃ  Ã©tÃ© fait ? si oui, par qui ?", "- Quelles sont les informations communiquÃ©es Ã  ce stade ?"]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["ALERTE DES SERVICES :", "Astreinte SIRACEDPC (mise en place structure suivi dâ€™Ã©vÃ©nement ou gestion de crise)", "CODIS/COSSIM (pour convocation officier de liaison Ã  la PrÃ©fecture)", "DDTM (dispositif forestier de surveillance des massifs et coordination routiÃ¨re)", "Services du cabinet du prÃ©fet de police dÃ©lÃ©guÃ©", "COG (groupement de gendarmerie 13) / DIPN (CIC : centre dâ€™information et de commandement)", "EMIZDS (information ouverture de la cellule de suivi ou du COD)", "Sous-prÃ©fet dâ€™arrondissement (liaison maire(s) concernÃ©(s))", "Communication prÃ©fecture", "SINSIC.", "Selon les enjeux :", "Autoroutes :", "Sur tronÃ§on non concÃ©dÃ© : CIGT / Services du cabinet du prÃ©fet de police dÃ©lÃ©guÃ© (C.R.S /Gendarmerie) / CRICR", "Sur tronÃ§on concÃ©dÃ© : SociÃ©tÃ© dâ€™Autoroute (ESCOTA, ASF) / Services du cabinet du prÃ©fet de police dÃ©lÃ©guÃ© (C.R.S /Gendarmerie) / CRICR", "Voies ferrÃ©es : EIC PACA (GPMM et RDT 13 sont Ã©galement gestionnaires de rÃ©seaux)", "Ligne HT 400 kV et 225 kV :", "ConsidÃ©rer la ligne comme stratÃ©gique avec un enjeu supÃ©rieur Ã  celui Â« feu de forÃªtÂ»", "En liaison avec lâ€™EMIZDS, prendre contact avec RTE pour connaÃ®tre :", "lâ€™impact de la coupure (nombre dâ€™abonnÃ©s, sites particuliers, â€¦)", "le dÃ©lai nÃ©cessaire Ã  la coupure et celui correspondant au rÃ©tablissement", "Les dÃ©partements concernÃ©s devront Ãªtre informÃ©s de lâ€™Ã©ventualitÃ© de la coupure de la ligne HT"]}]}, {"code": "2.B", "title": "Vigilance MÃ©tÃ©o APIC", "family": "Risques naturels", "sections": [{"heading": "SynthÃ¨se", "items": ["EvÃ©nement concernÃ©", "PrÃ©cipitations intenses et trÃ¨s intenses."]}, {"heading": "Alerte initiale", "items": ["Outil dâ€™avertissement complÃ©mentaire aux vigilances mÃ©tÃ©orologiques et crues.", "Information des maires abonnÃ©es au service et de la prÃ©fecture sur les prÃ©cipitations intenses ou trÃ¨s intenses dÃ©tectÃ©es dans les communes ou Ã  proximitÃ© immÃ©diate (bassin Amont)."]}, {"heading": "DÃ©clenchement", "items": ["Lâ€™outil APIC :", "MÃ©tÃ©o-France a dÃ©veloppÃ© un service dâ€™Â« Avertissement Pluies Intenses pour les Communes Â», informant les maires des prÃ©cipitations intenses ou trÃ¨s intenses dÃ©tectÃ©es sur leur commune ou Ã  proximitÃ© immÃ©diate.", "Service complÃ©mentaire de la vigilance mÃ©tÃ©orologique et de la vigilance crue, APIC est un service gratuit dâ€™avertissement aux communes, il suffit de sâ€™abonner sur le site internet https://apic.meteo.fr", "ConditionnÃ© Ã  la disponibilitÃ© dâ€™informations reÃ§ues de radars mÃ©tÃ©orologiques, qualifiant lâ€™intensitÃ© des prÃ©cipitations (2 niveaux), il permet dâ€™anticiper lâ€™inondation par ruissellement ou crue rapide.", "Toutes les communes des Bouches du RhÃ´ne y sont Ã©ligibles et lâ€™abonnement APIC permet dâ€™accÃ©der aux avertissements de communes voisines (de 1Ã 10) notamment celles situÃ©es en amont."]}, {"heading": "APIC et gestion de crise", "items": ["Accessible aux SDIS et aux prÃ©fectures, le SIRACEDPC 13 a crÃ©Ã© un compte APIC pour recevoir les avertissements concernant le dÃ©partement des Bouches du RhÃ´ne et consulter le site."]}, {"heading": "RÃ©ception des avertissements", "items": ["Lâ€™appel vocal nâ€™a pas Ã©tÃ© sÃ©lectionnÃ©, en consÃ©quence, les avertissements sont envoyÃ©s par", "SMS / sur les portables dâ€™astreinte SIRACEDPC aux nÂ° : 06.14.88.88.87 et 06.09.73.86.57", "MEL / sur les adresses gÃ©nÃ©riques : pref-siracedpc@bouches-du-rhone.gouv.fr et pccrise-13@bouches-du-rhone.pref.gouv.fr"]}, {"heading": "Consultation du site", "items": ["On accÃ¨de au site, exclusivement rÃ©servÃ© aux mairies, aux prÃ©fectures , aux services de prÃ©vision des crues et Ã  MÃ©tÃ©o-France par lâ€™adresse : https://apic.meteo.fr", "A lâ€™ouverture, cliquer sur Â« se connecter en tant que prÃ©fecture Â»", "Choisir le dÃ©partement BdR dans le menu dÃ©roulant le mot de passe est 3jthoi3e / valider", "AccÃ¨s Ã  la page dâ€™accueil comportant :", "Lâ€™affichage des paramÃ¨tres de lâ€™abonnement et des moyens de rÃ©ception", "les onglets Â« cartographie Â» et Â« communes abonnÃ©es Â»", "La cartographie, actualisÃ©e de Â¼ dâ€™heure en Â¼ dâ€™heure, indique :", "en violet les communes subissant des prÃ©cipitations intenses = niveau1", "en fuschia les communes subissant des prÃ©cipitations trÃ¨s intenses = niveau 2", "Dans le menu communes abonnÃ©es, on trouve la liste des abonnements principaux et celle des communes surveillÃ©es, au titre de lâ€™abonnement principal.", "Si un avertissement APIC est en cours, la commune est signalÃ©e par un tÃ©lÃ©phone"]}]}, {"code": "2.C", "title": "Vigilance crue", "family": "Risques naturels", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Crues suite Ã  phÃ©nomÃ¨ne mÃ©tÃ©orologique."]}, {"heading": "Alerte initiale", "items": ["Le dÃ©partement des Bouches-du-RhÃ´ne comporte 4 cours dâ€™eau majeurs surveillÃ©s par 2 SPC (service de prÃ©vision des crues).", "Le niveau de vigilance/alerte est diffusÃ© et consultable sur : www.vigicrues.ecologie.gouv.fr"]}, {"heading": "DÃ©clenchement", "items": ["PrÃ©visions de SPC Grand Delta et SPC MÃ©diterranÃ©e Est"]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["ETAT DE VIGILANCE VERT", "Pas dâ€™action particuliÃ¨re requise", "ETAT DE VIGILANCE JAUNE", "Risque de crue ou de montÃ©e rapide des eaux n'entraÃ®nant pas de dommages significatifs, mais pouvant nÃ©cessiter une vigilance particuliÃ¨re dans le cas d'activitÃ©s saisonniÃ¨res et/ou exposÃ©es. Le CODIS et le COSSIM informe les maires et les services.", "Affiner si nÃ©cessaire les prÃ©visions avec le SPC concernÃ© ;", "Rester en contact avec le CODIS et le COSSIM.", "ETAT DE VIGILANCE ORANGE", "Risque de crue gÃ©nÃ©ratrice de dÃ©bordements importants susceptibles dâ€™avoir un impact significatif sur la vie collective et la sÃ©curitÃ©. Si lâ€™analyse des bulletins dâ€™informations locaux confirme la nÃ©cessitÃ© dâ€™une action des pouvoirs publics, la prÃ©fecture procÃ¨dera Ã  lâ€™alerte de lâ€™ensemble des services opÃ©rationnels, et des maires si nÃ©cessaires : ouverture dâ€™une cellule de suivi en prÃ©fecture.", "Affiner les prÃ©visions avec le SPC concernÃ© et MÃ©tÃ©o-France (CMIR) ;", "Activation si nÃ©cessaire par lâ€™astreinte SIRACEDPC dâ€™une cellule de suivi dâ€™Ã©vÃ©nement en prÃ©fecture : SIRACEDPC â€“ services de secours â€“ Communication PrÃ©fecture ;", "Avertir le service communication de la prÃ©fecture qui prend contact avec les mÃ©dias locaux et prÃ©pare Ã©ventuellement un communiquÃ© de presse ;", "Informer, le cas Ã©chÃ©ant, les maires par fax et/ou SMS (Easylink) ;", "Rester en contact avec le CODIS et le COSSIM.", "ETAT DE VIGILANCE ROUGE", "Risque de crue majeure. Menace directe et gÃ©nÃ©ralisÃ©e de la sÃ©curitÃ© des personnes et des biens. Elle justifie la mobilisation immÃ©diate de l'ensemble des acteurs et des moyens au niveau du dÃ©partement.", "Activation du COD par lâ€™astreinte SIRACEDPC et consolidation des prÃ©visions mÃ©tÃ©orologiques et de crues ;", "Avertir le service communication de la prÃ©fecture qui prend contact avec les mÃ©dias locaux et prÃ©pare un communiquÃ© de presse ;", "Informer les maires par fax et/ou SMS (Easylink) ;", "Anticiper les demandes de renforts selon besoins auprÃ¨s de lâ€™EMIZDS."]}]}, {"code": "2.D", "title": "Inondations", "family": "Risques naturels", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Inondations suite Ã  phÃ©nomÃ¨ne mÃ©tÃ©orologique."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision du prÃ©fet."]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["En complÃ©ment du dispositif de vigilance crues (cf.Vigilance crue), approuvÃ© dans le cadre du rÃ¨glement de surveillance, de prÃ©vision et de transmission de lâ€™information sur les crues (RIC), les objectifs des dispositions spÃ©cifiques ORSEC Inondations sont de :", "DÃ©finir les missions des diffÃ©rents services appelÃ©s Ã  participer Ã  la gestion des inondations et de leurs consÃ©quences ;", "ArrÃªter un schÃ©ma de coordination des services intervenants, notamment au travers de la mise en place dâ€™une cellule de crise.", "Dans le cas oÃ¹ une cellule de suivi dâ€™Ã©vÃ©nement ne soit pas dÃ©jÃ  activÃ©e en prÃ©fecture , auquel cas les services essentiels Ã  la gestion de crise seront dÃ©jÃ  alertÃ©s :", "Mise en alerte des services (hors services de secours) :", "Astreinte SIRACEDPC pour grÃ©ement du COD ;", "Services du cabinet du prÃ©fet de police dÃ©lÃ©guÃ© ;", "CORG (groupement de gendarmerie 13) ;", "CIC (Direction dÃ©partementale de la sÃ©curitÃ© publique) ;", "DDTM (police de lâ€™eau et coordination des gestionnaires routiers) ;", "Conseil GÃ©nÃ©ral (PC sÃ»retÃ©) ;", "ARS /APHM /SAMU ;", "DREAL ;", "Sous-prÃ©fet(s) dâ€™arrondissement(s) concernÃ©(s) ;", "Communication prÃ©fecture ;", "SINSIC ;", "COZ (information)."]}]}, {"code": "2.E", "title": "Ã‰vacuation des campings en zone de submersion rapide", "family": "Risques naturels", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Vigilance crues sur cours d'eau, de niveau ORANGE ou ROUGE.", "Ã‰pisodes mÃ©tÃ©orologiques : vigilance mÃ©tÃ©o Orage et/ou Pluies-Inondations, de niveau ORANGE ou ROUGE ."]}, {"heading": "Alerte initiale", "items": ["Pour les cours dâ€™eau : messages vigilance crues Ã©manant des SPC Grand Delta et MÃ©diterranÃ©e Est ;", "Pour la mÃ©tÃ©o : bulletins de suivi vigilance pour le dÃ©partement 13 ou bulletins spÃ©ciaux zone de dÃ©fense (SPZEF)."]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision du prÃ©fet", "en lien avec le(s) maire(s) concernÃ©(s)"]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["Alerte prÃ©fecture â€“ mobilisation des astreintes :", "Astreinte SIRACEDPC pour grÃ©ement du COD ou de la cellule de suivi ;", "Services du cabinet du prÃ©fet de police dÃ©lÃ©guÃ© ;", "Astreinte Communication."]}, {"heading": "2 niveaux :", "items": ["Niveau ORANGE, relayÃ© par le SIRACEDPC avec rÃ©union Ã©ventuelle dâ€™une cellule de suivi en prÃ©fecture ;", "Niveau ROUGE, relayÃ© par le SIRACEDPC avec rÃ©union systÃ©matique dâ€™un COD en prÃ©fecture."]}, {"heading": "Structures :", "items": ["Cellule de suivi : PPOL, SDIS, BMPM, DDTM / par liaison tÃ©lÃ©phonique : MÃ©tÃ©o-France, SPC Grand Delta et/ou SPC Med-Est ;", "COD : PPOL, DIPN, GGD, CRS, ARS, DREAL, DDTM, CD 13, SDIS, BMPM, DMD, SAMU / par liaison tÃ©lÃ©phonique : VNF, MÃ©tÃ©o-France, SPC Grand Delta et/ou SPC Med-Est."]}, {"heading": "ProcÃ©dure spÃ©cifique Â« Campings Â»", "items": ["(instruction du gouvernement du 06 octobre 2014 NOR : DEVP149070J)", "En cas de vigilance ORANGE : point tÃ©lÃ©phonique sur la situation locale avec le(s) maire(s) concernÃ©(s) pour Ã©valuation de la nÃ©cessitÃ© dâ€™Ã©vacuer les campings en zone de submersion rapide.", "Les remontÃ©es dâ€™information seront centralisÃ©es par la DDTM (RDI) pour proposition Ã©ventuelle dâ€™Ã©vacuation, en prenant en compte les mesures de prÃ©caution qui auraient dÃ©jÃ  Ã©tÃ© prises par un ou plusieurs maire.", "En cas de vigilance ROUGE : le prÃ©fet donne les consignes dâ€™Ã©vacuation systÃ©matique pour tous les campings concernÃ©s.", "Diffusion du message ad hoc (cf. modÃ¨le en piÃ¨ce jointe).", "Observation : Lorsquâ€™il est procÃ©dÃ© Ã  lâ€™Ã©vacuation dâ€™un ou plusieurs campings, le(s) maire(s) concernÃ©(s) devra (ont) activer leur PCS."]}]}, {"code": "2.F", "title": "Canicule", "family": "Risques naturels", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["DÃ©clenchement dâ€™un niveau dâ€™alerte du plan canicule (4 niveaux )"]}, {"heading": "Alerte initiale", "items": ["Des Ã©pisodes aigus de pollution de lâ€™air Ã  lâ€™ozone peuvent survenir Ã  lâ€™occasion de forte canicule."]}, {"heading": "DÃ©clenchement", "items": ["Niveau 1 â€“ Veille saisonniÃ¨re", "Niveau 2 â€“ Avertissement chaleur", "Niveau 3 â€“ Alerte canicule", "Niveau 4 â€“ Mobilisation maximale"]}, {"heading": "Conditions dâ€™activation", "items": ["Du 1er juin au 15 septembre de chaque annÃ©e, activation dâ€™une veille saisonniÃ¨re sur lâ€™Ã©volution climatique et sanitaire ;", "Lâ€™ARS PACA prÃ©pare et met en Å“uvre la communication prÃ©ventive au plan local."]}, {"heading": "Niveau 2 : Avertissement chaleur", "items": ["Phase de veille renforcÃ©e", "Une information factuelle des maires par le prÃ©fet (SIRACEDPC) sur la base du bulletin spÃ©cial de MÃ©tÃ©o France,", "- des actions de communication prÃ©parÃ©es par lâ€™ARS et coordonnÃ©es avec le service communication de la prÃ©fecture de rÃ©gion et de dÃ©partement,"]}, {"heading": "Conditions de dÃ©clenchement", "items": ["Le PrÃ©fet, au regard de lâ€™expertise de lâ€™ARS, dÃ©cide du passage du dÃ©partement en niveau 3 Â« alerte canicule Â».", "Le SIRACEDPC envoie lâ€™alerte aux services concernÃ©s.", "Une cellule de suivi est activÃ©e Ã  la prÃ©fecture avec des remontÃ©es dâ€™information quotidiennes auprÃ¨s du COZ."]}, {"heading": "Composition de la cellule de suivie :", "items": ["PrÃ©fecture â€“ SIRACEDPC/SRCI", "Services du cabinet du prÃ©fet de police dÃ©lÃ©guÃ©", "Agence rÃ©gionale de santÃ© PACA (coordination de lâ€™organisation sanitaire et mÃ©dico-sociale conformÃ©ment aux dispositions du volet ORSAN-CLIM)", "MÃ©tÃ©o-France", "SDIS 13", "BMPM", "DIRECCTE", "DDDCS", "DDPP", "DDTM", "Conseil dÃ©partemental", "MÃ©tropole Aix Marseille Provence", "Mairie de Marseille", "DASEN (en pÃ©riode scolaire)"]}, {"heading": "Mesures Ã©ventuelles :", "items": ["Interdiction de manifestations festives, sportivesâ€¦.", "Actions de communication prÃ©ventive.", "Le prÃ©fet peut mettre en place certaines des mesures dÃ©partementales."]}, {"heading": "Conditions de dÃ©clenchement", "items": ["Le Premier Ministre peut demander au prÃ©fet dâ€™activer le niveau de mobilisation maximale.", "Le prÃ©fet peut Ã©galement proposer dâ€™activer le niveau de mobilisation maximale en fonction de lâ€™expertise de lâ€™ARS, des donnÃ©es mÃ©tÃ©orologiques et de la constatation dâ€™effets collatÃ©raux (sÃ©cheresse, pannes ou dÃ©lestages Ã©lectriques, saturation des hÃ´pitaux, pollution de lâ€™air, â€¦)", "DÃ¨s le dÃ©clenchement du niveau 4 Â« mobilisation maximale Â», le prÃ©fet :", "Alerte les services selon les mÃªmes modalitÃ©s que pour le niveau 3 Â« alerte canicule Â» ;", "Active le COD ;", "Met en Å“uvre les Ã©lÃ©ments du dispositif ORSEC pour traiter les diffÃ©rents aspects de la situation.", "Dans ce cadre le COD :", "Se tient informer de la situation sur le terrain ;", "Propose au prÃ©fet les mesures nÃ©cessaires en vue dâ€™assurer la protection des populations, des biens et de lâ€™environnement ;", "PrÃ©pare les Ã©ventuelles rÃ©quisitions de moyens publics ou privÃ©s ;", "PrÃ©pare et transmet les Ã©ventuelles demandes au COZ en matiÃ¨re de renforts extÃ©rieurs ;", "Dirige et coordonne lâ€™action de ces renforts ;", "Rends compte aux Ã©chelons supÃ©rieurs (COZ et COGIC) ;", "Fourni Ã  la cellule communication les renseignements nÃ©cessaires Ã  lâ€™information des mÃ©dias.", "Point particulier :", "Le COD peut solliciter auprÃ¨s des maires la communication des registres nominatifs quâ€™ils ont constituÃ©s pour le recensement des personnes Ã¢gÃ©es et des personnes en situation de handicap qui en ont fait la demande."]}]}, {"code": "2.G", "title": "SÃ©isme et effondrements de bÃ¢timents", "family": "Risques naturels", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Sâ€™applique :", "Ã€ tout Ã©vÃ©nement sismique susceptible dâ€™occasionner des dommages significatifs aux personnes, aux infrastructures ou aux rÃ©seaux essentiels ;", "En cas dâ€™effondrements multiples de bÃ¢timents, quelle quâ€™en soit la cause, dÃ¨s lors que lâ€™ampleur des dommages est Ã©tendue sur plusieurs communes ou que le nombre potentiel de victimes dÃ©passe les capacitÃ©s de rÃ©ponse courante communale."]}, {"heading": "Alerte initiale", "items": ["Alerte sismique via bulletin du CEA ou COGIS OU Information / Perception du territoire (CF Fiche B1.1)"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision du prÃ©fet.", "(Pour une simple secousse, DOS MAIRE avec communication centralisÃ©e par SRCI)"]}, {"heading": "Scenarii de rÃ©fÃ©nrece", "items": ["4 scenarii de rÃ©fÃ©rence (Cf stratÃ©gie de rÃ©ponse â€“ Fiche B4) :", "Scenario MINEUR (simple secousse) â€“ Cf Fiche 5.1", "Scenario MOYEN (sÃ©isme avec dÃ©gÃ¢ts lÃ©ger sans rupture de flux) - Cf Fiche 5.2", "Scenario MAJEUR (sÃ©isme majeur avec rupture de flux) - Cf Fiche 5.3", "Effondrements multiples de bÃ¢timents (Ex : TempÃªte ALEX - Alpes Maritimes) â€“ Cf Fiche 5.4"]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["Cf Fiche B1.1 et D1 â€“ Messages FR-ALERT", "Actions rÃ©flexes", "Prise en compte de la vraisemblance dâ€™un sÃ©isme :", "Observer lâ€™activitÃ© sismique relevÃ©e Ã  partir du site Internet https://sismoazur.oca.eu/#/", "Observer et suivre les relevÃ©s dâ€™intensitÃ© Ã  partir du site Internet https://www.franceseisme.fr/", "Informer la chaÃ®ne ORSEC via GEDICOM (Cf. Fiche B1.2)", "Solliciter des expertises (Cf. Fiche B3) :", "Du BRGM (Permanence tÃ©lÃ©phonique 24 / 24 â€“ 02 38 64 34 34)", "Forces dâ€™expertise via le COZ :", "du Groupe dâ€™intervention macrosismique (GIM) ;", "de lâ€™Association franÃ§aise du gÃ©nie parasismique (AFPS) ;", "du Service de traitement dâ€™image et de tÃ©lÃ©dÃ©tection (SERTIT).", "Mise en Å“uvre prÃ©ventive des moyens permettant la continuitÃ© des transmissions Ã  savoir les moyens satellitaires et le rÃ©seau radio ADRASEC (Cf. Fiche C7 â€“ D3).", "Risques technologiques"]}]}, {"code": "3.A", "title": "NOVI (Â« nombreuses victimes Â»)", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Nombreuses victimes impliquant lâ€™intervention dâ€™importants moyens mÃ©dicaux (incendie, accident de transport, attentat, effondrement dâ€™immeuble...)"]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM Ã  lâ€™autoritÃ© prÃ©fectorale â€“ CORG â€“ CIC â€“ SAMU", "Ã‰valuation : oÃ¹ - quand - quoi - moyens- enjeux ?"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision de lâ€™autoritÃ© prÃ©fectorale sur proposition du CODIS ou COSSIM", "Dans le cadre dâ€™Ã©vÃ¨nements Ã  vocation purement sanitaire (hors secours Ã  personne), lâ€™ARS et/ou le SAMU propose(nt) au PrÃ©fet ou son reprÃ©sentant de mobiliser les acteurs et/ou services concernÃ©s (notamment les Ã©tablissements de santÃ© et mÃ©dicosociaux, les professionnels de santÃ©, les acteurs extra sanitaires)."]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["Cas gÃ©nÃ©ral de mise en alerte des services (hors services de secours/ CORG/CIC et SAMU) :", "Astreinte SIRACEDPC pour grÃ©ement du COD", "Services du cabinet du prÃ©fet de police dÃ©lÃ©guÃ©", "DDTM (coordination des gestionnaires routiers)", "Conseil DÃ©partemental (PC sÃ»retÃ©)", "ARS /APHM", "DREAL", "Sous-prÃ©fet(s) dâ€™arrondissement(s) concernÃ©(s)", "Communication prÃ©fecture", "SINSIC", "COZ (information)"]}, {"heading": "Direction des opÃ©rations", "items": ["Le prÃ©fet, DOS (Directeur des OpÃ©rations de secours), dÃ©cide la mise en Å“uvre du plan.", "Active le COD comme base arriÃ¨re des opÃ©rations de secours : PP13, SIRACEDPC, SINSIC, Communication PrÃ©fecture, reprÃ©sentants des services concernÃ©s (dont DDTM et ARS).", "Habituellement dirigÃ© par le directeur de cabinet, le SIRACEDPC en assure le fonctionnement.", "DÃ©signe un membre du corps prÃ©fectoral auprÃ¨s du COS chargÃ© de diriger le PCO (ou PC interservices auprÃ¨s du PC de site)", "DÃ©cide de lâ€™activation de la CUMP selon lâ€™Ã©valuation faite par APHM et SAMU", "Autorise la levÃ©e du plan quand lâ€™opÃ©ration est terminÃ©e, en maintenant un dispositif allÃ©gÃ© dans lâ€™attente dâ€™un bilan dÃ©finitif qui sera diffusÃ© Ã  la presse.", "Le SDIS ou le BMPM dÃ©signe le Commandant des OpÃ©rations de Secours (COS)", "LE COS :", "diffuse lâ€™arrÃªtÃ© de dÃ©clenchement Ã  : SAMU, CORG, CIC (DIPN), DDTM, maire(s), sous-prÃ©fet dâ€™arrondissement, autoritÃ© judiciaire ;", "mobilise les moyens de secours et de sÃ©curitÃ©", "active le PCS (poste de commandement de site inter services) implantÃ© sur le terrain, armÃ© par moyens mobiles SDIS/BMP. Il est dirigÃ© par un membre du corps prÃ©fectoral, habituellement le sous-prÃ©fet dâ€™arrondissement. Si nÃ©cessaire le volet interservices peut Ãªtre regroupÃ© au sein dâ€™un PCO distinct sous lâ€™autoritÃ© du sous-prÃ©fet dÃ©signÃ© (en rÃ¨gle gÃ©nÃ©rale, le sous-prÃ©fet dâ€™arrondissement).", "est assistÃ© par :", "Le DSI : Directeur Sauvetage Incendie, chargÃ© des opÃ©rations non mÃ©dicales ;", "Le DSM : Directeur des Secours MÃ©dicaux, qui peut Ãªtre :", "le mÃ©decin chef du SDIS, sur le dÃ©partement hors Marseille ;", "le mÃ©decin chef du BMP sur la ville de Marseille ;", "le mÃ©decin chef du SAMU sur lâ€™aÃ©roport Marseille Provence.", "un PMA Â« poste mÃ©dical avancÃ© Â» qui regroupe, trie, Ã©vacue les victimes ;", "le SAMU qui apporte son concours, assure rÃ©partition et accueil en hÃ´pitaux ;", "la CUMP : cellule dâ€™urgence mÃ©dico psychologique organisÃ©e par lâ€™APHM et activÃ©e selon lâ€™Ã©valuation faite par le SAMU"]}]}, {"code": "3.B", "title": "Novis sinus", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Nombreuses victimes impliquant lâ€™intervention dâ€™importants moyens mÃ©dicaux (incendie, accident de transport, attentat, effondrement dâ€™immeuble...)", "Information outil", "Le portail SINUS est lâ€™outil national unique par lequel les autoritÃ©s accÃ¨dent Ã  la totalitÃ© du dÃ©nombrement des victimes.", "Il permet de fournir le plus dâ€™informations possibles sur les victimes afin de faciliter leur identification par lâ€™autoritÃ© judiciaire et les services dâ€™enquÃªte compÃ©tents, leur prise en charge mÃ©dicale par les Ã©tablissements de santÃ© (ES) et lâ€™information des familles et des proches, assurÃ©e par la CIAV.", "ProcÃ©dure", "Ainsi, lors dâ€™un Ã©vÃ©nement gÃ©nÃ©rant de nombreuses victimes (accident, attentat..), SINUS va permettre Ã  tous les services de partager les informations relatives aux victimes :", "Les primo-intervenants (pompiers, policiers), vont doter les victimes dâ€™un bracelet SINUS ;", "Au PMA : les victimes seront catÃ©gorisÃ©es (UA, UR) et orientÃ©es vers une structure dâ€™accueil.", "A chaque Ã©tape de la chaÃ®ne des secours, de nouvelles informations viendront enrichir la base SINUS (pour les personnes ne passant pas par le PMA, ce sont les centres hospitaliers qui les doteront dâ€™un bracelet dâ€™identification).", "Au final, les listes pourront Ãªtre Ã©ditÃ©es en COD Ã  destination des autoritÃ©s :", "par catÃ©gorisation : UA, UR, DCD ;", "par identitÃ© ;", "par destination hospitaliÃ¨re.", "ATTENTION : pour les personnes dÃ©cÃ©dÃ©es, lâ€™autoritÃ© judiciaire peut bloquer la liste nominative.", "Adresses SINUS :", "https://sinus.novi.interieur.gouv.fr (pour les cas rÃ©els)", "https://formation.sinus.novi.interieur.gouv.fr (pour sâ€™entraÃ®ner, pour les exercices).", "Connexion :", "EN COD, SINUS NE PERMET QUE LA CONSULTATION OU Lâ€™EDITION DE LISTES"]}]}, {"code": "3.C", "title": "Plan particulier dâ€™intervention", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Accident industriel concernant un Ã©tablissement SEVESO II - seuil haut â€“ (donc dotÃ© dâ€™un plan particulier dâ€™intervention)"]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM Ã  lâ€™autoritÃ© prÃ©fectorale â€“ CORG â€“ CIC â€“ SAMU", "Ã‰valuation : oÃ¹ - quand - quoi - moyens- enjeux ?"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision de lâ€™autoritÃ© prÃ©fectorale"]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["CODIS / COSSIM assurent la transmission de lâ€™alerte aux mairies, organismes et services figurant dans le schÃ©ma dâ€™alerte du PPI concernÃ©.", "En cas dâ€™extrÃªme urgence, lâ€™exploitant est compÃ©tent pour demander directement auprÃ¨s des services concernÃ©s la mise en Å“uvre de contre-mesures immÃ©diates (interruption trafic routier, ferroviaire, â€¦)", "Astreinte SIRACEDPC pour grÃ©ement du COD", "Services du cabinet du prÃ©fet de police dÃ©lÃ©guÃ©", "DDTM (coordination des gestionnaires routiers)", "Conseil DÃ©partemental (PC sÃ»retÃ©)", "ARS /APHM", "DREAL", "Sous-prÃ©fet(s) dâ€™arrondissement(s) concernÃ©(s)", "Communication prÃ©fecture", "SINSIC", "COZ (information)", "Organisation de commandement", "Le prÃ©fet, DOS (Directeur des OpÃ©rations de secours) :", "Active le COD (SIRACEDPC)", "DÃ©signe le sous-prÃ©fet qui dirige le PCO (mis en place par le commandant des opÃ©rations de secours)", "Fait prÃ©parer un premier communiquÃ© de presse", "Fait rÃ©diger le message de mise en Å“uvre du PPI et le fait diffuser par le CODIS / COSSIM", "DÃ©clenche les contre-mesures externes immÃ©diates (si celles-ci nâ€™ont pas Ã©tÃ© activÃ©es ou demandÃ©es en mode rÃ©flexe par lâ€™exploitant) :", "Alerte des populations par : (au signal dâ€™alerte : mise Ã  lâ€™abri, Ã©coute de la radio)", "sirÃ¨ne PPI (exploitant)", "sirÃ¨ne SAIP (COZ)", "ensemble Mobiles dâ€™alerte (mairie/BMPM/SDIS)", "Interruption des circulations de transit : RoutiÃ¨re / Ferroviaire / AÃ©rienne (mesure prise par DSAC)", "Fait diffuser par les radios des messages Ã©tablis par le service Communication", "Si nÃ©cessaire, met en Å“uvre des mesures de sauvegarde complÃ©mentaires :", "Ã‰vacuation partielle, totale, ou confinement gÃ©nÃ©ral ;", "Bouclage et surveillance de la zone ;", "Installation de postes mÃ©dicaux avancÃ©s (PMA) ;", "DÃ©clenchement Ã©ventuel du NOVI ;", "Ouverture de Centres MÃ©dicaux dâ€™Evacuation ;", "Cellule dâ€™Urgence mÃ©dico-psychologique ;", "Centre dâ€™Accueil et de REgroupement (CARE) des communes dans le cadre de leurs PCS.", "ProcÃ¨de rÃ©guliÃ¨rement Ã  :", "points de situation avec PCO et Exploitant ;", "points presse et communiquÃ©s ;", "compte-rendus aux autoritÃ©s centrales via le COZ ;", "tenue de tableaux des moyens mis en Å“uvre et demandes de renforts ;", "contacts avec les Ã©lus ;", "bilans prÃ©cis des victimes.", "Active, si nÃ©cessaire, une cellule de rÃ©ponse aux appels du public", "Autorise la levÃ©e du dispositif", "CIPChef d'Incident PrincipalInterlocuteur unique du DOSInterface avec les services de l'EIC PACAet de l'EF SNCFCILChef d'Incident LocalInterlocuteur unique du COSAssure la protection despersonnels prÃ©sents surle siteInterface avec leCOGCCOGCCentre rÃ©gionalInterlocuteur du CODISAssure la gestion de l'incidentAssure la diffusion de l'informationSupplÃ©e le CIL en son absenceDOSDirige les opÃ©rations de secoursCOSMets en Å“uvre les opÃ©rations de secoursCODIS / COSSIMMise en Å“uvre de l'alerteAssure l'interface entre COS etCOGC en l'absence du CIL EIC PACAPREFECTUREServices de secours", "CIP", "Chef d'Incident Principal", "Interlocuteur unique", "du DOS", "Interface avec les", "services de l'EIC PACA", "et de l'EF SNCF", "CIL", "Chef d'Incident Local", "Interlocuteur unique", "du COS", "Assure la protection des", "personnels prÃ©sents sur", "le site", "Interface avec le", "COGC", "COGC", "Centre rÃ©gional", "Interlocuteur", "du CODIS", "Assure la gestion de", "l'incident", "Assure la diffusion de", "l'information", "SupplÃ©e le CIL en", "son absence", "DOS", "Dirige les opÃ©rations de secours", "COS", "Mets en Å“uvre", "les opÃ©rations de secours", "CODIS / COSSIM", "Mise en Å“uvre de l'alerte", "Assure l'interface entre COS et", "COGC en l'absence du CIL", "EIC PACA", "PREFECTURE", "Services de secours"]}]}, {"code": "3.D", "title": "RÃ©seaux ferroviaires", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Accident grave de chemin de fer impliquant lâ€™intervention de moyens complÃ©mentaires Ã  ceux du plan dâ€™intervention et de sÃ©curitÃ© (PIS) de lâ€™EIC PACA.", "DÃ©clenchement possible simultanÃ© des dispositions ORSEC NOVI et TMD."]}, {"heading": "Alerte initiale", "items": ["par EXPLOITANT Ã  lâ€™autoritÃ© prÃ©fectorale â€“ CORG â€“ CIC â€“ SAMU", "Ã‰valuation : oÃ¹ - quand - quoi - moyens- enjeux ?"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision de lâ€™autoritÃ© prÃ©fectorale sur proposition de lâ€™exploitant", "Zones de compÃ©tences", "SDIS :", "aux tÃªtes nord des tunnels de la Nerthe et de Marseille ;", "aux tÃªtes nord et sud des tunnels du Mussuguet et des Janots.", "BMPM :", "aux tÃªtes sud des tunnels de la Nerthe et de Marseille."]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["En cas dâ€™Ã©vÃ¨nements graves ou prÃ©sentant d'emblÃ©e un caractÃ¨re spÃ©cifique susceptible d'entraÃ®ner une dÃ©gradation de la situation des passagers et/ou des riverains tels que :", "arrÃªt prolongÃ© d'un train de voyageurs dans un tunnel ;", "accident de personnes ;", "feu sur rame ;", "accident impliquant de nombreuses victimes ;", "fuite d'une substance chimique ou radioactive ;", "Le gestionnaire ferroviaire concernÃ©, active son PIS ou sa procÃ©dure d'urgence. Il alerte immÃ©diatement et systÃ©matiquement les services publics pour permettre la montÃ©e en puissance rapide des moyens de secours. Si un Ã©vÃ¨nement est signalÃ© directement aux services d'incendie et de secours, ces derniers transmettent immÃ©diatement l'information au gestionnaire ferroviaire compÃ©tent : CRC du COGC (EIC PACA).", "NB : Le Grand Port Maritime de Marseille et la RDT 13 sont Ã©galement gestionnaires de rÃ©seaux ferroviaires."]}]}, {"code": "3.E", "title": "AÃ©roport Marseille-Provence", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Accident ou risque dâ€™accident dâ€™un aÃ©ronef intervenant", "en ZA (zone dâ€™aÃ©rodrome = dans lâ€™emprise de lâ€™aÃ©roport Marseille-Provence)", "en ZVA (zone voisine dâ€™aÃ©rodrome = limitÃ©e dans le PSS)"]}, {"heading": "Alerte initiale", "items": ["par Tour de contrÃ´le aÃ©roport Marseille-Provence"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision de lâ€™autoritÃ© prÃ©fectorale Ã  la demande du directeur de lâ€™aÃ©roport", "Phases", "VEILLE :Il y a Ã©tat de veille si un pilote signale, ou si lâ€™on soupÃ§onne des dÃ©faillances Ã  bord, mais non des dÃ©faillances de nature Ã  entraÃ®ner normalement des difficultÃ©s graves Ã  lâ€™atterrissage (mouvements dâ€™aÃ©ronef en essais ou au stade dâ€™expÃ©rimentation, vibration moteur, mauvaises conditions de visibilitÃ© mÃ©tÃ©orologique.....).", "ALERTE : Il y a Ã©tat dâ€™alerte si lâ€™on signale ou lâ€™on soupÃ§onne quâ€™un aÃ©ronef a subi, ou risque de subir une dÃ©faillance de nature Ã  entraÃ®ner un risque dâ€™accident (voyant incendie allumÃ©, fuite dâ€™huile, baisse de pression hydraulique des freins, fumÃ©e ou odeur anormale Ã  lâ€™ intÃ©rieur de lâ€™aÃ©ronef, train dâ€™atterrissage, alerte Ã  la bombe, mauvaises conditions mÃ©tÃ©orologiques...).", "ACCIDENT : Il y a ï¾ Ã©tat dâ€™accidentï¾ lorsquâ€™un Ã©vÃ©nement mettant en cause la sÃ©curitÃ© de lâ€™aÃ©ronef ou de ses passagers (chute, incendie en vol ou au roulage, etc.) vient de se produire ou va inÃ©vitablement se produire.", "Ã€ la demande du Directeur de lâ€™exploitant de lâ€™aÃ©rodrome (CCIMP) ou de son reprÃ©sentant, le PrÃ©fet met en Å“uvre les dispositions spÃ©cifiques de lâ€™AÃ©roport Marseille-Provence."]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["Ouverture dâ€™une cellule de crise (PCO) dÃ¨s la phase dâ€™alerte, avec les services suivants :", "SIRACEDPC", "Services du cabinet du prÃ©fet de police dÃ©lÃ©guÃ©", "DDTM (coordination des gestionnaires routiers)", "Communication prÃ©fecture", "SINSIC", "SDIS/BMPM", "GGD", "Compagnie aÃ©rienne exploitante ou assistante", "DSAC", "DÃ¨s rÃ©ception du message dâ€™alerte et/ou du message dâ€™accident, le PCO est ouvert et armÃ© par lâ€™exploitant dâ€™aÃ©rodrome. Ce dernier installe et sâ€™assure du bon fonctionnement des moyens de communication et de logistique.", "Un PCO (PC directeur) est ouvert et armÃ© par la SPAF avec lâ€™aide de la CCIMP", "Un COD (base arriÃ¨re) est ouvert en prÃ©fecture."]}, {"heading": "Direction des opÃ©rations", "items": ["-en ZA et ZVA : la Direction des OpÃ©rations de Secours (D.O.S.) est assurÃ©e par lâ€™autoritÃ© prÃ©fectorale. Le DOS (Sous-PrÃ©fet dâ€™Istres ou Directeur de Cabinet) est installÃ© dans le PC OpÃ©rationnel.", "en ZVA maritime : la responsabilitÃ© de la direction des opÃ©rations de secours incombe au PrÃ©fet des Bouches-du-RhÃ´ne."]}]}, {"code": "3.F", "title": "BA 125 (Istres)", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Accident dâ€™un aÃ©ronef intervenant en :", "ZA (zone dâ€™aÃ©rodrome)", "ZVA (zone voisine dâ€™aÃ©rodrome )"]}, {"heading": "Alerte initiale", "items": ["par BA 125"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision de lâ€™autoritÃ© prÃ©fectorale sur proposition du commandant de la BA 125 ou du CODIS"]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["Bilan :", "Type dâ€™appareil", "Heure de lâ€™accident", "CoordonnÃ©es de lâ€™accident", "Nombre de passagers ou capacitÃ© maximale dâ€™aÃ©ronef", "Incendie observÃ© ou non (ampleur des dÃ©gÃ¢ts)", "Dangers reprÃ©sentÃ©s par lâ€™Ã©pave (matiÃ¨res dangereuses, munitionsâ€¦)", "Etcâ€¦", "Services prÃ©sents au COD :", "Sous-prÃ©fet dâ€™Istres ou autre sous-prÃ©fet dÃ©signÃ©", "SDIS", "SAMU / APHM / ARS", "DIPN", "Gendarmerie", "Mairies dâ€™Istres, Fos-sur-Mer, Saint Martin de Crau", "Conseil GÃ©nÃ©ral", "SINSIC", "Communication prÃ©fecture"]}, {"heading": "Direction des opÃ©rations", "items": ["Le PrÃ©fet est le DOS, Directeur des OpÃ©rations de Secours.", "Le Directeur dÃ©partemental du SDIS est le COS, Commandant des OpÃ©rations de Secours.", "Le COS dÃ©termine lâ€™emplacement du Poste de Commandement AvancÃ©/Poste de Commandement de Site (PCA/PCS) et mobilise les moyens de secours et de sÃ©curitÃ©.", "Un COD est activÃ© Ã  la prÃ©fecture des Bouches-du-RhÃ´ne.", "ACTION PREFECTORALE", "faire diffuser lâ€™alerte des services par le CODIS conformÃ©ment au schÃ©ma gÃ©nÃ©ral dâ€™alerte,", "prendre lâ€™arrÃªtÃ© de dÃ©clenchement des dispositions spÃ©cifiques ORSEC BA 125 et le faire diffuser par le CODIS 13 conformÃ©ment au schÃ©ma gÃ©nÃ©ral dâ€™alerte,", "dÃ©signer un membre du corps prÃ©fectoral auprÃ¨s du COS,", "faire prÃ©parer dÃ¨s que possible par le service communication de la prÃ©fecture, le message dâ€™alerte aux radios et le premier communiquÃ© de presse,", "informer lâ€™Ã©chelon national via le COZ sud,", "faire prÃ©parer lâ€™arrÃªtÃ© de levÃ©e du plan lorsque la situation le permet."]}]}, {"code": "3.G", "title": "Sauvetage aÃ©ro-terrestre (Sater)", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Les dispositions spÃ©cifiques Orsec pour sauvetage aÃ©ro-terresre (Sater) ont pour objet la recherche terrestre et la localisation prÃ©cise d'un aÃ©ronef en dÃ©tresse et de leurs occupants.", "La localisation de lâ€™Ã©pave provoque lâ€™arrÃªt des recherches et lâ€™engagement effectif de la phase de secours aux victimes.", "Celle-ci peut nÃ©cessiter lâ€™activation des dispositions Orsec NOVI.", "Organisation", "Lâ€™organisation Â« Sater Â» est dÃ©clinÃ©e en phases opÃ©rationnelles.", "En coordination avec lâ€™ARCC, correspondant aÃ©ronautique compÃ©tent au titre des recherches aÃ©riennes, le prÃ©fet de dÃ©partement est le directeur des opÃ©rations de recherches terrestres (DOR) dans les phases BRAVO Ã  CHARLIE. Le commandant de la gendarmerie dÃ©partementale ou le directeur dÃ©partemental de la sÃ©curitÃ© publique est le commandant des opÃ©rations de recherches terrestre (COR) dans les phases BRAVO Ã  CHARLIE", "Lâ€™ARCC de Lyon informe la prÃ©fecture de sa dÃ©cision dâ€™engager lâ€™ADRASEC par tÃ©lÃ©phone et par fax de confirmation.", "Prendre contact avec :", "CODIS / COSSIM (prÃ©venu par le COZ sud)", "CORG / CIC", "ADRASEC", "ARCC (pour le tenir informÃ©)"]}]}, {"code": "3.H", "title": "Pollution marine (POLMAR/Terre)", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Les dispositions spÃ©cifiques Â« POLMAR/Terre Â» du plan ORSEC des Bouches-du-RhÃ´ne ont pour objet de faire face Ã  une pollution marine de grande ampleur, par hydrocarbures ou tout autre produit (notamment chimique), rÃ©sultant d'un accident ou d'une avarie maritime, terrestre ou aÃ©rienne."]}, {"heading": "Alerte initiale", "items": ["par CROSSMED, CODIS, COSSIM, GIE, plaisanciersâ€¦."]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision de lâ€™autoritÃ© prÃ©fectorale"]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["Recouper lâ€™information et obtenir tous renseignements utiles en liaison avec :", "PREMAR ;", "CROSSMED pour apprÃ©cier les capacitÃ©s des moyens de lutte en mer Ã  rÃ©sorber la pollution et Ã©pargner les cÃ´tes et anticiper la mise en Å“uvre Ã©ventuelle du dispositif de lutte Ã  terre ;", "MÃ©tÃ©o-France ;", "CEDRE ;", "CODIS/COSSIM ;", "COZ SUD.", "Anticiper la mise en oeuvre Ã©ventuelle du dispositif de lutte Ã  terre par lâ€™alerte/mobilisation :", "du sous-prÃ©fet dâ€™arrondissement potentiellement concernÃ© ;", "du/des maire(s), de la /des intercommunalitÃ©s potentiellement concernÃ©(s) ;", "du conseil gÃ©nÃ©ral ;", "de la DDTM, de la DREAL, du GPMM et de lâ€™IFREMER.", "Si la situation menace dâ€™Ã©voluer vers une pollution de grande ampleur, le PrÃ©fet dÃ©cide la mise en Å“uvre, des dispositions spÃ©cifiques POLMAR/Terre :", "le DDSIS ou le commandant du BMPM est le COS selon le secteur territorial principalement concernÃ©. Le PrÃ©fet lui fait prÃ©parer la montÃ©e en puissance du schÃ©ma de conduite des opÃ©rations de lutte ;", "le PrÃ©fet donne lâ€™ordre au CODIS (ou au COSSIM) de dÃ©clencher lâ€™alerte en vue de lâ€™activation du COD ;", "il fait activer, par le COS, le ou les PCOpÃ©rationnel(s) et PCAvancÃ©s nÃ©cessaires (jusquâ€™Ã  4 PCO et 11 PCA prÃ©dÃ©terminÃ©s) et les chantiers ;", "il convoque au COD les experts (CEDRE, IFREMER.â€¦) ;", "il informe le COZ chargÃ© de lâ€™information des dÃ©partements littoraux limitrophes (Gard, Var) ;", "il fait procÃ©der Ã  lâ€™Ã©change Â« dâ€™officiers de liaison Â» avec PREMAR, et Ã  lâ€™activation dâ€™une cellule communication/presse conjointe si possible."]}, {"heading": "Direction des opÃ©rations", "items": ["En mer : Si la menace de pollution ou la pollution en mer prÃ©sente un degrÃ© Ã©levÃ© de gravitÃ© ou de complexitÃ©, notamment s'il n'est pas possible d'y faire face avec les seuls moyens ordinaires des administrations, le prÃ©fet maritime met en oeuvre le plan ORSEC Maritime, dispositions spÃ©cifiques Â« POLMAR Â».", "Le prÃ©fet maritime est alors chargÃ© de la direction des opÃ©rations de lutte en mer sous l'autoritÃ© directe du Premier ministre.", "A terre : Si la menace de pollution ou la pollution s'exerce sur le littoral et prÃ©sente un degrÃ© Ã©levÃ© de gravitÃ© ou de complexitÃ©, notamment s'il n'est pas possible d'y faire face avec les", "seuls moyens ordinaires des collectivitÃ©s locales et de l'Ã‰tat, le prÃ©fet de dÃ©partement met en oeuvre les dispositions spÃ©cifiques Â« POLMAR/Terre Â».", "Le prÃ©fet de dÃ©partement est alors chargÃ© de la direction des opÃ©rations de lutte Ã  terre sous l'autoritÃ© du ministre de l'IntÃ©rieur.", "(pollutions de petite et moyenne ampleur = Â« infra polmar Â» = compÃ©tence du maire)", "Face aux pollutions de faible et moyenne ampleur ; les opÃ©rations de lutte incombent aux communes et sont dirigÃ©es par les Maires qui en supportent le coÃ»t financier.", "Si nÃ©cessaire, une cellule dâ€™appui aux collectivitÃ©s peut Ãªtre rÃ©unie autour de lâ€™autoritÃ© prÃ©fectorale. Elle est composÃ©e de la prÃ©fecture, de la DDTM, de lâ€™ARS, du SDIS, du BMPM, de la DIRM, de la DREAL, de la DRFiP, de la gendarmerie et/ou de la DIPN, de la DDPP. Orsec POLMAR Terre nâ€™est pas mis en Å“uvre ."]}]}, {"code": "3.I", "title": "Barrage de Bimont", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Risque de rupture ou rupture du barrage de Bimont.", "Inondation de la vallÃ©e de lâ€™Arc, soit 8 communes impactÃ©es :", "Zone de proximitÃ© immÃ©diate : Le Tholonet, Aix-en-Provence, Meyreuil", "Zone dâ€™inondation spÃ©cifique : Ventabren, Velaux, Coudoux, La Fare-les-Oliviers, Berre-lâ€™Etang"]}, {"heading": "Alerte initiale", "items": ["Alerte initiale : SociÃ©tÃ© du canal de Provence vers PrÃ©fet, DREAL", "En cas dâ€™extrÃªme urgence, lâ€™exploitant est compÃ©tent pour demander directement auprÃ¨s des services concernÃ©s la mise en Å“uvre de contre-mesures immÃ©diates (interruption trafic routier, ferroviaire, â€¦)", "CIC", "CODIS", "sous-prÃ©fet de permanence", "prÃ©fet de police", "Maire des communes concernÃ©es", "DREAL"]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["Cf. ci-aprÃ¨s"]}]}, {"code": "3.J", "title": "SpÃ©lÃ©o-secours", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Accident de spÃ©lÃ©ologie."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM (sur appel dâ€™un particulier)"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision de lâ€™autoritÃ© prÃ©fectorale sur proposition du CODIS ou COSSIM"]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["ALERTE DES SERVICES :", "Astreintes SIRACEDPC et Cabinet PrÃ©fet de Police", "FÃ©dÃ©ration FranÃ§aise de SpÃ©lÃ©o : Conseiller Technique DÃ©partemental (CTD)", "COG (groupement de gendarmerie 13)", "DIPN (CIC : centre dâ€™information et de commandement)", "CODIS/COSSIM", "SAMU /APHM /ARS", "Mairie concernÃ©e", "Sous-prÃ©fet dâ€™arrondissement concernÃ©", "CMIR sud-est", "Communication prÃ©fecture", "COZ sud"]}, {"heading": "Direction des opÃ©rations", "items": ["Le prÃ©fet, DOS (Directeur des OpÃ©rations de secours),", "DÃ©signe le COS : Directeur du SDIS ou Commandant du BMPM (selon zone accident).", "Le COS :", "dÃ©termine lâ€™emplacement du PCO (avec la participation du CTD, police, gendarmerie) ;", "demande au maire de prendre immÃ©diatement, sous sa responsabilitÃ©, toutes les dispositions nÃ©cessaires Ã  lâ€™installation du PCO, au ravitaillement et Ã  lâ€™hÃ©bergement ;", "est chargÃ© de la coordination des opÃ©rations en surface, et tient le directeur des secours et le maire informÃ©s en permanence ;", "fait acheminer moyens et personnels nÃ©cessaires au dÃ©roulement de lâ€™opÃ©ration.", "Active le COD ou un PCO au plus prÃ¨s de lâ€™Ã©vÃ¨nement :", "Cabinet PrÃ©fet de Police, SIRACEDPC, SINSIC, Communication, reprÃ©sentants des services concernÃ©s.", "Si les circonstances le justifient, le prÃ©fet peut dÃ©cider de faire activer en prÃ©fecture une cellule lÃ©gÃ¨re de suivi, qui monterait en puissance (COD) si les opÃ©rations devaient se prolonger."]}]}, {"code": "3.K", "title": "DÃ©minage", "family": "Risques technologiques", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Interventions sur munitions de guerre", "Interventions sur engins explosifs improvisÃ©s (EEI) ou alerte Ã  la bombe", "SÃ©curisation de voyages officiels (VO) de personnalitÃ©s ou de manifestations socio-culturelles", "RÃ©quisition de terrains privÃ©s aux fins de destruction dâ€™urgence des matiÃ¨res activÃ©s ou des munitions collectÃ©es."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM (sur appel dâ€™un particulier)"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision de lâ€™autoritÃ© prÃ©fectorale sur proposition du CODIS ou COSSIM"]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["Cette fiche rÃ©flexe comprend les actions Ã  conduire en heures ouvrables (J.H.O) et en heures non ouvrables (J.H.N.O).", "Interventions sur munitions de guerre", "J.H.O :", "Le SIRACEDPC peut Ãªtre avisÃ© dâ€™une demande dâ€™intervention : particuliers / maires / forces de l'ordre / services de secours.", "se fait adresser un mail de confirmation comportant tous les renseignements utiles pour lâ€™intervention des dÃ©mineurs, Ã  l'adresse pref-deminage@bouches-du-rhone.gouv.fr", "rappelle les mesures conservatoires Ã  prendre sur les lieux : balisage/interdiction dâ€™accÃ¨s.", "saisie du centre de dÃ©minage de Marseille par mail (cd-marseille@interieur.gouv.fr).", "Si urgence, doubler dâ€™un appel tÃ©lÃ©phonique sur le portable du chef de centre : 06 26 78 00 49 ou 06 26 78 00 35 ou 06 26 78 00 36.", "J.H.N.O :", "le COGIC (centre opÃ©rationnel de gestion interministÃ©rielle des crises) est avisÃ© par les forces de l'ordre ou les services de secours ; il saisit le centre de dÃ©minage (les munitions de guerre ne justifient en principe pas une intervention immÃ©diate).", "Sur le littoral :", "pour engin immergÃ© ou marqueurs marines, alerter le centre des opÃ©rations maritimes (PREMAR), bureau des opÃ©rations cÃ´tiÃ¨res (cf. annuaire ORSEC).", "Interventions sur EEI ou alerte Ã  la bombe", "J.H.O :", "contacter le cabinet du PrÃ©fet de police (secrÃ©tariat : 04 96 10 64 31)", "J.H.N.O :", "contacter lâ€™astreinte Cabinet du PrÃ©fet de police", "Missions de sÃ©curitÃ© sur VO et manifestations", "En principe, ces missions sont programmÃ©es : la demande dâ€™intervention est donc exceptionnelle.", "En J.H.N.O : Saisir le COGIC.", "RÃ©quisition de terrains privÃ©s aux fins de destruction dâ€™urgence", "J.H.O et J.H.N.O :", "Expertise du dÃ©mineur chef de la mission relative Ã  la nÃ©cessitÃ© de dÃ©truire au plus prÃ¨s du lieu de dÃ©couverte de matiÃ¨res actives ou de munitions", "Information du SIRACEDPC / du sous-prÃ©fet de permanence ainsi que des services de police ou gendarmerie territorialement compÃ©tents par le dÃ©mineur chef de la mission en cas de refus de mise Ã  disposition d'un terrain privÃ©", "Prise de contact avec le propriÃ©taire du terrain par les services de police ou gendarmerie territorialement compÃ©tents. En l'absence d'accord Ã  l'amiable, il est rendu compte sans dÃ©lai au SIRACEDPC / au sous-prÃ©fet de permanence du refus et des motifs invoquÃ©s.", "RÃ©daction par le SIRACEDPC / le cadre d'astreinte du SIRACEDPC de l'arrÃªtÃ© de rÃ©quisition et transmission aux services chargÃ©s de son exÃ©cution (Police Nationale = via la C.I.C. / Gendarmerie Nationale = via le CORG)", "Notification au propriÃ©taire par les services de police ou gendarmerie territorialement compÃ©tent et information du maire de la commune concernÃ©e"]}, {"heading": "Direction des opÃ©rations", "items": ["Risques sanitaire", "Risques divers"]}]}, {"code": "5.A", "title": "Electro-secours", "family": "Risques divers", "sections": [{"heading": "Ã‰vÃ©nement concernÃ©", "items": ["Risque de rupture d'approvisionnement en Ã©lectricitÃ© ou rupture de cet approvisionnement Ã  raison d'un alÃ©a climatique, d'une dÃ©faillance technique ou d'un acte de malveillance."]}, {"heading": "Alerte initiales", "items": ["par CODIS, COSSIM"]}, {"heading": "DÃ©clenchement", "items": ["DÃ©cision du PREFET"]}, {"heading": "Direction des opÃ©rations", "items": ["Les rÃ©seaux de transport et de distribution ont pour fonction dâ€™acheminer lâ€™Ã©lectricitÃ© en assurant lâ€™Ã©quilibre entre lâ€™offre et la demande. Cette adÃ©quation garantit lâ€™approvisionnement des", "clients dans des conditions optimales de sÃ»retÃ©, de fiabilitÃ© et de compÃ©titivitÃ©. Deux filiales dâ€™EDF se partagent la tÃ¢che :", "- RTE (RÃ©seau de Transport dâ€™Ã‰lectricitÃ©) transporte lâ€™Ã©lectricitÃ© haute et trÃ¨s haute tension,", "- ENEDIS gÃ¨re le rÃ©seau de distribution qui achemine lâ€™Ã©lectricitÃ© vendue par les fournisseurs dâ€™Ã©nergie, quels quâ€™ils soient aux utilisateurs (particuliers, entreprises, collectivitÃ©s).", "Enedis a :", "- la charge des travaux de rÃ©tablissement du rÃ©seau avec les moyens du plan ADEL et la facilitation des pouvoirs publics ;", "- la responsabilitÃ© technique des raccordements des alimentations de secours pour les usagers sensibles raccordÃ©s au rÃ©seau de distribution basse tension."]}, {"heading": "ModalitÃ©s dâ€™alerte", "items": ["PrÃ©venir le sous-prÃ©fet de permanence. Si plan dÃ©clenchÃ©, aller au point 2.", "Alerte des services :", "BMPM", "DREAL", "ARS", "SAMU", "APHM", "DDTM", "Sous-prÃ©fet dâ€™arrondissement concernÃ©", "Communication prÃ©fecture", "SINSIC", "Personnel SIRACEDPC", "En temps que de besoin : ERDF, RTE, DDPP, DDCS, METEO, MAMP, CD13, PP13, SNCF, DSDEN etc.."]}]}], "glossary": ["ADRASEC : Association dÃ©partementale des radioamateurs au service de la sÃ©curitÃ© civile", "AFPS : Association franÃ§aise du gÃ©nie parasismique", "APHM : Assistance publique â€“ HÃ´pitaux de Marseille", "APIC : Avertissement Pluies Intenses Ã  la Commune (service MÃ©tÃ©o-France)", "ARCC : Centre de coordination et de contrÃ´le des routes aÃ©riennes (Air Route Control Center)", "ARS : Agence rÃ©gionale de santÃ©", "ASF : Autoroutes du Sud de la France", "BA 125 : Base aÃ©rienne 125 d'Istres", "BASC : Base aÃ©rienne de sÃ©curitÃ© civile", "BMPM : Bataillon de marins-pompiers de Marseille", "BRGM : Bureau de recherches gÃ©ologiques et miniÃ¨res", "CCIMP : Chambre de commerce et d'industrie mÃ©tropolitaine Provence", "CEA : Commissariat Ã  l'Ã©nergie atomique et aux Ã©nergies alternatives", "CEDRE : Centre de documentation, de recherche et d'expÃ©rimentations sur les pollutions accidentelles des eaux", "CIAV : Cellule interministÃ©rielle d'aide aux victimes", "CIC : Centre d'information et de commandement (Direction dÃ©partementale de la sÃ©curitÃ© publique)", "CIGT : Centre d'ingÃ©nierie et de gestion du trafic", "CMIR : Centre mÃ©tÃ©orologique interrÃ©gional (MÃ©tÃ©o-France)", "COD : Centre opÃ©rationnel dÃ©partemental", "CODIS : Centre opÃ©rationnel dÃ©partemental d'incendie et de secours", "COG : Centre opÃ©rationnel de la gendarmerie", "COGIC : Centre opÃ©rationnel de gestion interministÃ©rielle des crises", "COGIS : Centre opÃ©rationnel de gestion et d'information sismique (CEA)", "CORG : Centre opÃ©rationnel de la gendarmerie (rÃ©gional)", "COS : Commandant des opÃ©rations de secours", "COSSIM : Centre opÃ©rationnel des services de secours et d''incendie de Marseille", "COZ : Centre opÃ©rationnel de zone", "CRICR : Centre rÃ©gional d'information et de coordination routiÃ¨res", "CROSSMED : Centre rÃ©gional opÃ©rationnel de surveillance et de sauvetage MÃ©diterranÃ©e", "CRS : Compagnie rÃ©publicaine de sÃ©curitÃ©", "CUMP : Cellule d'urgence mÃ©dico-psychologique", "DASEN : Directeur acadÃ©mique des services de l'Ã©ducation nationale", "DDDCS : Direction dÃ©partementale dÃ©lÃ©guÃ©e Ã  la cohÃ©sion sociale", "DDPP : Direction dÃ©partementale de la protection des populations", "DDTM : Direction dÃ©partementale des territoires et de la mer", "DIPN : Direction interdÃ©partementale de la police nationale", "DIRECCTE : Direction rÃ©gionale des entreprises, de la concurrence, de la consommation, du travail et de l'emploi", "DIRM : Direction interrÃ©gionale de la mer", "DMD : DÃ©lÃ©guÃ© militaire dÃ©partemental", "DOS : Directeur des opÃ©rations de secours", "DREAL : Direction rÃ©gionale de l'environnement, de l'amÃ©nagement et du logement", "DSAC : Direction de la sÃ©curitÃ© de l'aviation civile", "EDF : Ã‰lectricitÃ© de France", "EIC PACA : Ã‰tablissement Infrastructure de Circulation PACA (SNCF)", "EMIZDS : Ã‰tat-major interministÃ©riel de zone de dÃ©fense et de sÃ©curitÃ©", "ENEDIS : Gestionnaire du rÃ©seau de distribution d'Ã©lectricitÃ© (ex-ERDF)", "ESCOTA : SociÃ©tÃ© des autoroutes EstÃ©rel CÃ´te d'Azur Provence Alpes", "FR-ALERT : SystÃ¨me national d'alerte et d'information des populations par tÃ©lÃ©phone mobile", "GEDICOM : Outil de gestion de crise du COGIC (remontÃ©e des informations opÃ©rationnelles)", "GGD : Groupement de gendarmerie dÃ©partementale", "GIM : Groupe d'intervention macrosismique", "GPMM : Grand Port Maritime de Marseille", "IFREMER : Institut franÃ§ais de recherche pour l'exploitation de la mer", "MAMP : MÃ©tropole Aix-Marseille-Provence", "NOVI : Nombreuses victimes", "ORSAN-CLIM : Organisation de la rÃ©ponse du systÃ¨me de santÃ© â€“ volet canicule et chaleur extrÃªme", "ORSEC : Organisation de la rÃ©ponse de sÃ©curitÃ© civile", "PC : Poste de commandement", "PCA : Poste de commandement avancÃ©", "PCO : Poste de commandement opÃ©rationnel", "PCS : Plan communal de sauvegarde", "PIS : Poste d'information et de soins", "PMA : Poste mÃ©dical avancÃ©", "POLMAR : Plan de lutte contre les pollutions marines", "PPI : Plan particulier d'intervention", "PREMAR : PrÃ©fet maritime", "PSS : Plan de secours spÃ©cialisÃ©", "RDT 13 : RÃ©gie des transports mÃ©tropolitains (rÃ©seau de transport du dÃ©partement 13)", "RIC : RÃ¨glement de surveillance, de prÃ©vision et de transmission de l'information sur les crues", "RTE : RÃ©seau de transport d'Ã©lectricitÃ©", "SAIP : SystÃ¨me d'alerte et d'information des populations", "SAMU : Service d'aide mÃ©dicale urgente", "SDIS : Service dÃ©partemental d'incendie et de secours", "SERTIT : Service de traitement d'image et de tÃ©lÃ©dÃ©tection (UniversitÃ© de Strasbourg)", "SINSIC : Service de lâ€™innovation numÃ©rique et des systÃ¨mes dâ€™information et de communication", "SINUS : SystÃ¨me d'information numÃ©rique unifiÃ© de suivi des victimes", "SIRACEDPC : Service interministÃ©riel rÃ©gional des affaires civiles et Ã©conomiques de dÃ©fense et de la protection civile", "SNCF : SociÃ©tÃ© nationale des chemins de fer franÃ§ais", "SPC : Service de prÃ©vision des crues", "SPZEF : Bulletin spÃ©cial de zone et espaces frontaliers (MÃ©tÃ©o-France)", "SRCI : Service rÃ©gional de communication et d'information", "TMD : Transport de matiÃ¨res dangereuses", "VNF : Voies navigables de France", "ZA : Zone d'accueil", "ZVA : Zone de vie des victimes autonomes"]};
const DEFAULT_COMMAND_TYPES = [['Activation de la cellule de suivi',"J'active une cellule de suivi."],['Prise de direction des opÃ©rations',"Je prends la direction des opÃ©rations."],['Mise en oeuvre de certaines mesures d\'un dispositif ORSEC',"Je mets en oeuvre certaines mesures d'un dispositif ORSEC."],['Activation d\'un dispositif opÃ©rationnel ORSEC',"J'active un dispositif opÃ©rationnel ORSEC."],['LevÃ©e de certaines mesures d\'un dispositif ORSEC',"Je lÃ¨ve certaines mesures d'un dispositif ORSEC."],['LevÃ©e de l\'ensemble des mesures d\'un dispositif ORSEC',"Je lÃ¨ve l'ensemble des mesures des dispositions ORSEC mises en oeuvre."]];
let commandTypes = DEFAULT_COMMAND_TYPES.map(x => x.slice());

const defaultServices = ['SDIS','BMPM','SAMU','ARS','DDTM','DREAL','DZSI','DZPAF','GMAR','PP13','DDSP','GGD','CRS','DMD','MÃ‰TROPOLE','SRCI','GPMM','DIPJ'].map(name => ({name, cod: false, pco: false}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2. COUCHE STORAGE (isolÃ©e â€” synchro locale + Supabase)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Storage = window.SICODApi?.storage || {
  load() { return null; },
  save() {}
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 3. Ã‰TAT APPLICATIF â€” unique, initialisÃ© une seule fois
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEFAULT_DYNAMIC_LISTS = {
  directoryGroups: ['AutoritÃ© - Ordre public - Justice','Secours - SantÃ© - MÃ©dical','Environnement - Energie','Circulation - Transport','Militaire','CIP','CollectivitÃ©s territoriales','Autres'],
  planTypes: ["DG (Dispositions gÃ©nÃ©rales)","DS (Dispositions spÃ©cifiques)","PPI (Plan particulier d'intervention)"],
  planPriorities: ['P1','P2','P3'],
  planStatuses: ['A jour','A programmer','En cours'],
  planRiskTypes: ['Naturel','Technologique','Sanitaire','SÃ©curitÃ© publique','Transport','Autre'],
  dutyRoles: ['Astreinte 1','Astreinte 2'],
  dutyAgents: ['Agent 1','Agent 2'],
  reflexFamilies: ['Risques naturels','Risques technologiques','Risques divers','Autres'],
  directoryEntities: ['Autres']
};

const DEFAULT_SETTINGS = {
  theme: 'light',
  psFormat: 'detail',
  classification: 'Non protÃ©gÃ©',
  author: 'SIRACEDPC',
  dutySignerLastName: 'ALLIO',
  dutySignerFirstName: 'Julien',
  dutySignerFunction: 'Chef du SIRACEDPC',
  commandSignatureMode: 'delegation',
  commandSignatureName: 'Julien ALLIO',
  commandSignatureRole: 'SIRACEDPC',
  commandPhone: '04 84 35 40 00 (standard)',
  commandFax: '04 84 35 41 85',
  commandEmail: 'pref-pccrise-13@bouches-du-rhone.gouv.fr',
  commandAudioConf: '01 43 12 42 30 puis le 13603 suivi de #',
  brandLogo: '',
  favicon: '',
  pdfAppearance: {
    primaryColor: '#000091',
    accentColor: '#f5f5fe',
    textColor: '#161616',
    alertColor: '#e1000f',
    logoScale: 100
  },
  remoteSync: {
    provider: 'none',
    enabled: false,
    supabaseUrl: '',
    supabaseAnonKey: '',
    projectRef: ''
  },
  planExpiryYears: {},
  dynamicLists: {}
};

function buildDefaultState() {
  return {
    events: [],
    ps: [],
    contacts: [],
    tools: [],
    services: JSON.parse(JSON.stringify(defaultServices)),
    commandMessages: [],
    selectedCommandId: null,
    currentEventId: null,
    selectedPSId: null,
    selectedFiche: (reflexLibrary.fiches[0] || {}).code || null,
    reflexFiches: JSON.parse(JSON.stringify(reflexLibrary.fiches || [])),
    reflexGlossary: JSON.parse(JSON.stringify(reflexLibrary.glossary || [])),
    planItems: [],
    dutyAvailabilities: [],
    dutySchedule: [],
    settings: Object.assign({}, DEFAULT_SETTINGS, { dynamicLists: {} })
  };
}

// Chargement unique de l'Ã©tat
function isAuthLocked() {
  const authState = window.SICODApi?.system?.getAuthState?.() || {};
  return !!authState.configured && !authState.authenticated;
}

const _saved = isAuthLocked() ? null : Storage.load();
const state = Object.assign(buildDefaultState(), _saved || {});
const userAdminState = {
  loading: false,
  loaded: false,
  items: []
};
if (isAuthLocked()) clearLocalStateCache();

function ensureStateIntegrity() {
  state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings || {});
  state.settings.remoteSync = Object.assign({}, DEFAULT_SETTINGS.remoteSync, state.settings.remoteSync || {}, window.SICODApi?.system?.getRemoteConfig?.() || {});
  state.settings.dynamicLists = Object.assign({}, state.settings.dynamicLists || {});
  if (!Array.isArray(state.planItems)) state.planItems = [];
  if (!Array.isArray(state.dutyAvailabilities)) state.dutyAvailabilities = [];
  if (!Array.isArray(state.dutySchedule)) state.dutySchedule = [];
  if (!Array.isArray(state.contacts)) state.contacts = [];
  if (!Array.isArray(state.tools)) state.tools = [];
  if (!Array.isArray(state.commandMessages)) state.commandMessages = [];
  if (!Array.isArray(state.events)) state.events = [];
  if (!Array.isArray(state.ps)) state.ps = [];
  if (!Array.isArray(state.reflexFiches)) state.reflexFiches = JSON.parse(JSON.stringify(reflexLibrary.fiches || []));
  if (!Array.isArray(state.reflexGlossary)) state.reflexGlossary = JSON.parse(JSON.stringify(reflexLibrary.glossary || []));
  if (!Array.isArray(state.services) || !state.services.length) state.services = JSON.parse(JSON.stringify(defaultServices));
  state.ps.forEach((item) => {
    item.status = normalizePublishStatus(item.status, 'Brouillon');
  });
  state.commandMessages.forEach((item) => {
    item.status = normalizePublishStatus(item.status, 'Brouillon');
  });
  window.SICODDataModel?.ensureReferenceData(state, DEFAULT_DYNAMIC_LISTS);
  window.SICODDataModel?.migrateSnapshots(state);
  window.SICODPdfTemplates?.ensureState(state);
}

ensureStateIntegrity();
clearLocalStateCache();

// persist() â€” unique, stable
function persist() {
  Storage.save(state);
}

function clearLocalStateCache() {
  try {
    localStorage.removeItem('sicodStateV13');
    localStorage.removeItem('sicodRemoteConfigV1');
    localStorage.removeItem('sicod_sidebar_collapsed');
  } catch {}
}

function resetStateToDefaults() {
  const fresh = buildDefaultState();
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
  ensureStateIntegrity();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 4. UTILITAIRES GLOBAUX
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Ã‰chappe le HTML pour insertion sÃ©curisÃ©e */
function esc(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

/** Convertit les sauts de ligne en <br> avec Ã©chappement */
function nl2br(s) {
  return esc(s).replace(/\n/g, '<br>');
}

/** GÃ©nÃ¨re un identifiant unique court */
function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

/** Retourne un objet depuis un tableau par son id */
function byId(arr, id) {
  return Array.isArray(arr) ? arr.find(x => x.id === id) : null;
}

function getActiveItems(arr) {
  return window.SICODDataModel?.getActiveRecords(arr) || (Array.isArray(arr) ? arr : []);
}

function getActiveEventIds() {
  return new Set(getActiveItems(state.events).map((item) => item.id));
}

function isLinkedToActiveEvent(record) {
  if (!record?.eventId) return false;
  return getActiveEventIds().has(record.eventId);
}

/** Retourne le titre d'un Ã©vÃ©nement depuis son id */
function getEventTitle(id) {
  return (byId(state.events, id) || {}).title || 'Ã‰vÃ©nement supprimÃ©';
}

/** Formate une date ISO locale (YYYY-MM-DD) */
function toLocalISO(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Retourne aujourd'hui en ISO local */
function todayISO() {
  return toLocalISO(new Date());
}

/** Formate une date ISO ou Date en format franÃ§ais jj/mm/aaaa */
function formatDateFR(value){if(!value)return '';const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return `${m[3]}/${m[2]}/${m[1]}`;const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;}

/** Retourne l'heure actuelle HH:MM */
function timeHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

/** GÃ©nÃ¨re un badge HTML selon le statut */
function badge(status) {
  if (status === 'ArchivÃ©') return `<span class="badge warning">ArchivÃ©</span>`;
  if (status === 'DiffusÃ©' || status === 'ValidÃ©') return `<span class="badge success">${esc(status)}</span>`;
  return `<span class="badge info">${esc(status || 'Brouillon')}</span>`;
}

/** Parse une date locale ISO en objet Date (Ã  midi pour Ã©viter les dÃ©calages TZ) */
const PS_ALLOWED_STATUSES = ['Brouillon', 'DiffusÃ©'];
const COMMAND_ALLOWED_STATUSES = ['Brouillon', 'DiffusÃ©'];

function normalizePublishStatus(status, fallback = 'Brouillon') {
  const value = String(status || '').trim();
  if (!value) return fallback;
  if (value === 'DiffusÃ©' || value === 'ValidÃ©') return 'DiffusÃ©';
  if (value === 'Brouillon' || value === 'Ouvert') return 'Brouillon';
  return fallback;
}

function isPublishedStatus(status) {
  return normalizePublishStatus(status) === 'DiffusÃ©';
}

function buildFixedSignatureLines(signature) {
  const sig = signature || {};
  const lines = [];
  if (sig.mode === 'delegation') {
    lines.push('Pour le prÃ©fet, par dÃ©lÃ©gation');
    if (sig.role) lines.push(sig.role);
    if (sig.name) {
      lines.push('');
      lines.push(sig.name);
    }
    return lines;
  }
  lines.push('Le prÃ©fet');
  if (sig.name) {
    lines.push('');
    lines.push(sig.name);
  }
  return lines;
}

function drawFixedBottomRightSignature(doc, signature, opts = {}) {
  const lines = buildFixedSignatureLines(signature);
  const printableLines = lines.filter((line) => String(line || '').trim()).length;
  if (!printableLines) return false;
  const margin = Number(opts.margin || 10);
  const blockWidth = Number(opts.blockWidth || 52);
  const lineGap = Number(opts.lineGap || 4.8);
  const spacerGap = Number(opts.spacerGap || 4.5);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let height = 0;
  lines.forEach((line, index) => {
    height += line ? lineGap : spacerGap;
    if (index === lines.length - 1) height -= line ? (lineGap - 4) : spacerGap;
  });
  const centerX = pageW - margin - (blockWidth / 2);
  let y = pageH - margin - height;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(opts.textColor || [22, 22, 22]));
  doc.setFontSize(Number(opts.fontSize || 10));
  lines.forEach((line) => {
    if (line) {
      doc.text(String(line), centerX, y, { align: 'center', maxWidth: blockWidth });
      y += lineGap;
    } else {
      y += spacerGap;
    }
  });
  return true;
}

function parseDateLocal(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Formate une Date en chaÃ®ne locale franÃ§aise */
function formatDateLocal(dt) {
  if (!dt || isNaN(dt)) return 'â€”';
  return dt.toLocaleDateString('fr-FR');
}

/** Retourne le lundi de la semaine contenant dt */
function startOfMonday(dt) {
  const d = new Date(dt);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Retourne le dimanche (fin inclusive) d'une semaine dÃ©marrant le lundi */
function weekEndInclusive(monday) {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Retourne la liste dynamique configurÃ©e pour une clÃ©, avec fallback */
function getDynamicList(key) {
  const labels = window.SICODDataModel?.getReferenceLabels(state, key, DEFAULT_DYNAMIC_LISTS);
  return Array.isArray(labels) && labels.length ? labels : (DEFAULT_DYNAMIC_LISTS[key] || []).slice();
}

function getReferenceSnapshot(type, label) {
  const ref = window.SICODDataModel?.resolveReference(state, type, label, DEFAULT_DYNAMIC_LISTS);
  return {
    id: ref?.id || '',
    label: ref?.label || String(label || '').trim()
  };
}

function applyReferenceCatalogToState(referenceCatalog) {
  if (!referenceCatalog || typeof referenceCatalog !== 'object') return;
  Object.entries(referenceCatalog).forEach(([key, rows]) => {
    if (!Array.isArray(rows) || !rows.length) return;
    state.referenceData = state.referenceData || {};
    state.referenceData[key] = rows.map((row, index) => ({
      id: row.id,
      type: key,
      code: row.code || row.slug || row.id,
      label: row.label,
      slug: row.slug || window.SICODDataModel?.slugify?.(row.label) || '',
      status: row.status || 'active',
      sortOrder: Number.isFinite(row.sort_order) ? row.sort_order : (Number.isFinite(row.sortOrder) ? row.sortOrder : index),
      isActive: row.is_active !== false && row.isActive !== false,
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
      deletedAt: row.deleted_at || row.deletedAt || null,
      replacedById: row.replaced_by_id || row.replacedById || null
    }));
  });
  window.SICODDataModel?.ensureReferenceData(state, DEFAULT_DYNAMIC_LISTS);
}

async function pushReferenceCatalogToSupabase() {
  if (!window.SICODApi?.system?.pushReferenceCatalog) return;
  try {
    await window.SICODApi.system.pushReferenceCatalog(state.referenceData || {});
  } catch (error) {
    console.warn('[Settings] Synchronisation des listes de reference impossible :', error.message);
  }
}

async function hydrateReferenceCatalogFromSupabase() {
  if (!window.SICODApi?.system?.getReferenceCatalog) return false;
  try {
    const referenceCatalog = await window.SICODApi.system.getReferenceCatalog();
    if (!referenceCatalog || typeof referenceCatalog !== 'object') return false;
    applyReferenceCatalogToState(referenceCatalog);
    return true;
  } catch (error) {
    if (error.message === 'Connexion Supabase requise.') return false;
    console.warn('[Settings] Chargement des listes de reference impossible :', error.message);
    return false;
  }
}

/** Peuple un <select> avec des options */
function setSelectOptions(selectEl, items, selected) {
  if (!selectEl) return;
  selectEl.innerHTML = items.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if (selected !== undefined && items.includes(selected)) selectEl.value = selected;
}

/** Affiche un toast non-bloquant (type: 'success'|'error'|'info') */
function showToast(msg, type = 'success', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/** Affiche une boÃ®te de confirmation asynchrone â€” retourne Promise<boolean> */
function confirmAsync(msg) {
  return new Promise(resolve => {
    let dialog = document.getElementById('confirmDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'confirmDialog';
      dialog.innerHTML = `<p id="confirmDialogMsg"></p><div class="confirm-actions"><button class="fr-btn secondary" id="confirmNo">Annuler</button><button class="fr-btn" id="confirmYes">Confirmer</button></div>`;
      document.body.appendChild(dialog);
    }
    document.getElementById('confirmDialogMsg').textContent = msg;
    const yes = document.getElementById('confirmYes');
    const no = document.getElementById('confirmNo');
    const cleanup = result => { dialog.close(); yes.onclick = null; no.onclick = null; resolve(result); };
    yes.onclick = () => cleanup(true);
    no.onclick = () => cleanup(false);
    dialog.showModal();
  });
}

/** Marque binaire pour les exports PDF */
function mark(v) { return v ? '[X]' : '[ ]'; }

/** Ã‰chappe une valeur pour CSV */
function csvEscape(v) {
  const s = String(v ?? '');
  return (s.includes('"') || s.includes(';') || s.includes(',') || s.includes('\n'))
    ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** TÃ©lÃ©charge un Blob sous forme de fichier */
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
}

/** GÃ©nÃ¨re et tÃ©lÃ©charge un CSV */
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

/** Retourne la source logo courante (personnalisÃ©e ou dÃ©faut) */
const DEFAULT_BRAND_LOGO = 'assets/logo.png';
const DEFAULT_FAVICON = 'assets/favicon.ico';
const DEFAULT_DASHBOARD_BANNER = 'assets/banniere.png';

function normalizeStaticAssetPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }
  if (/^(?:[a-z]+:)?\/\//i.test(raw)) {
    try {
      const url = new URL(raw, window.location.href);
      const sameOrigin = url.origin === window.location.origin;
      if (sameOrigin && (url.pathname === '/banniere.png' || url.pathname === '/assets/banniere.png' || url.pathname === '/assets/logo.png' || url.pathname === '/assets/favicon.ico')) {
        return url.pathname.replace(/^\/+/, '');
      }
      return raw;
    } catch (e) {
      return raw;
    }
  }
  if (raw.startsWith('/')) {
    return raw.replace(/^\/+/, '');
  }
  return raw;
}

function currentLogoSrc() {
  return DEFAULT_BRAND_LOGO;
}

function currentDashboardBannerSrc() {
  return DEFAULT_DASHBOARD_BANNER;
}

function refreshDashboardBanner() {
  const wrap = document.getElementById('dashboardBannerWrap');
  const img = document.getElementById('dashboardBannerImage');
  if (!wrap || !img) return;
  const fallbacks = [DEFAULT_DASHBOARD_BANNER, 'banniere.png'];
  let index = 0;
  img.dataset.fallback = '0';
  img.onerror = function() {
    index += 1;
    if (index < fallbacks.length) {
      this.dataset.fallback = String(index);
      this.src = fallbacks[index];
    } else {
      wrap.style.display = 'none';
    }
  };
  img.src = fallbacks[0];
  wrap.style.display = '';
}

function updateDashboardBannerThumb(src) {
  const thumb = document.getElementById('settingDashboardBannerThumb');
  if (!thumb) return;
  if (src) {
    thumb.src = src;
    thumb.style.display = 'block';
  } else {
    thumb.removeAttribute('src');
    thumb.style.display = 'none';
  }
}


/** Retourne la source favicon courante */
function currentFaviconSrc() {
  return DEFAULT_FAVICON;
}

function addLogoPreserved(doc, x, y, maxW, maxH) {
  const src = currentLogoSrc();
  if (!src) return false;
  try {
    const props = doc.getImageProperties(src);
    const iw = props.width || 1, ih = props.height || 1;
    const logoScale = Math.max(40, Number(state.settings?.pdfAppearance?.logoScale || 100)) / 100;
    const ratio = Math.min((maxW * logoScale) / iw, (maxH * logoScale) / ih);
    const w = iw * ratio, h = ih * ratio;
    const type = String(props.fileType || 'PNG').toUpperCase();
    doc.addImage(src, type, x, y + (maxH - h) / 2, w, h);
    return true;
  } catch (e) {
    return false;
  }
}

function hexToRgb(hex, fallback) {
  const normalized = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16)
  ];
}

function getPdfAppearance() {
  const defaults = DEFAULT_SETTINGS.pdfAppearance;
  const custom = state.settings?.pdfAppearance || {};
  return {
    primary: hexToRgb(custom.primaryColor, hexToRgb(defaults.primaryColor, [0, 0, 145])),
    accent: hexToRgb(custom.accentColor, hexToRgb(defaults.accentColor, [245, 245, 254])),
    text: hexToRgb(custom.textColor, hexToRgb(defaults.textColor, [22, 22, 22])),
    alert: hexToRgb(custom.alertColor, hexToRgb(defaults.alertColor, [225, 0, 15])),
    logoScale: Math.max(40, Number(custom.logoScale || defaults.logoScale || 100))
  };
}

function normalizePlanStatus(value) {
  return String(value || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getPlanExpiryYearsForType(type) {
  const map = state.settings.planExpiryYears || {};
  const raw = map[type];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function applyPlanExpiryRules() {
  getActiveItems(state.planItems).forEach(item => {
    if (normalizePlanStatus(item.status) !== 'a jour') return;
    const years = getPlanExpiryYearsForType(item.type);
    if (!years || !item.approvalDate) return;
    const approval = parseDateLocal(item.approvalDate);
    if (!approval) return;
    const limit = new Date(approval);
    limit.setFullYear(limit.getFullYear() + years);
    if (new Date() > limit) item.status = 'A programmer';
  });
}

function isPlanExpired(item) {
  const years = getPlanExpiryYearsForType(item.type);
  if (!years || !item.approvalDate) return false;
  const approval = parseDateLocal(item.approvalDate);
  if (!approval) return false;
  const limit = new Date(approval);
  limit.setFullYear(limit.getFullYear() + years);
  return new Date() > limit;
}

function getPSSignatureConfig() {
  return {
    mode: state.settings.psSignatureMode || 'delegation',
    name: state.settings.psSignatureName || 'Nicolas HAUPTMANN',
    role: state.settings.psSignatureRole || 'le directeur de cabinet'
  };
}
function getEventSignatureConfig() {
  return {
    mode: state.settings.eventSignatureMode || 'delegation',
    name: state.settings.eventSignatureName || state.settings.psSignatureName || 'Nicolas HAUPTMANN',
    role: state.settings.eventSignatureRole || state.settings.psSignatureRole || 'le directeur de cabinet'
  };
}
function shouldApplyPdfSignature(context) {
  const idMap = {
    ps: 'psApplySignature',
    command: 'cmdApplySignature',
    event: 'eventApplySignature',
    duty: 'dutyApplySignature'
  };
  const id = idMap[context || ''];
  return !!(id && document.getElementById(id)?.checked);
}
function getEligiblePdfSignatureConfig(context) {
  if (!shouldApplyPdfSignature(context)) return { mode:'prefet', name:'', role:'' };
  return getPSSignatureConfig();
}
function drawPdfSignatureBlock(doc, x, y, opts = {}) {
  const sig = opts.signature || { mode: 'delegation', name: 'Nicolas HAUPTMANN', role: 'le directeur de cabinet' };
  const lineGap = opts.lineGap || 5;
  const blockWidth = opts.blockWidth || 62;
  const lines = sig.mode === 'delegation'
    ? ['Pour le prÃ©fet, par dÃ©lÃ©gation', sig.role || '', sig.name || ''].filter(Boolean)
    : ['Le prÃ©fet,', sig.name || ''].filter(Boolean);
  if (!lines.length) return y;
  lines.forEach((line, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.text(String(line), x, y, { align: 'center', maxWidth: blockWidth });
    y += lineGap;
    if (idx === 1 && sig.mode === 'delegation') y += 2;
    if (idx === 0 && sig.mode !== 'delegation') y += 2;
  });
  return y;
}

function renderPSSignatureHtml() {
  const sig = getEligiblePdfSignatureConfig('ps');
  if (!sig.name && !sig.role) return '';
  if (sig.mode === 'delegation') {
    return `<div class="ps-signature"><div class="ps-signature-box"><div class="sig-line1">Pour le prÃ©fet, par dÃ©lÃ©gation</div><div class="sig-line2">${esc(sig.role || '')}</div><div class="sig-line2">${esc(sig.name || '')}</div></div></div>`;
  }
  return `<div class="ps-signature"><div class="ps-signature-box"><div class="sig-line1">Le prÃ©fet</div><div class="sig-line2">${esc(sig.name || '')}</div></div></div>`;
}

/** Applique les assets de marque (logo/favicon) */
function applyBrandAssets() {
  document.querySelectorAll('.brand-logo').forEach(img => {
    img.onerror = () => {
      if (img.dataset.brandFallback === '1') {
        img.onerror = null;
        img.src = logoBase64;
        return;
      }
      img.dataset.brandFallback = '1';
      img.src = DEFAULT_BRAND_LOGO;
    };
    img.dataset.brandFallback = '0';
    img.src = currentLogoSrc();
  });
  document.querySelectorAll('.favicon-logo').forEach(img => {
    img.onerror = () => {
      if (img.dataset.faviconFallback === '1') return;
      img.dataset.faviconFallback = '1';
      img.src = DEFAULT_FAVICON;
    };
    img.dataset.faviconFallback = '0';
    img.src = currentFaviconSrc();
  });
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = currentFaviconSrc();
  refreshStorageStatus();
}


function applySidebarState() {
  const layout = document.getElementById('appLayout');
  if (!layout) return;
  layout.classList.toggle('sidebar-collapsed', layout.dataset.sidebarCollapsed === '1');
}

function toggleSidebar() {
  const layout = document.getElementById('appLayout');
  if (!layout) return;
  const collapsed = !layout.classList.contains('sidebar-collapsed');
  layout.classList.toggle('sidebar-collapsed', collapsed);
  layout.dataset.sidebarCollapsed = collapsed ? '1' : '0';
}

/** Applique le thÃ¨me clair/sombre */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
}

/** Bascule le thÃ¨me */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || state.settings.theme || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  state.settings.theme = next;
  applyTheme(next);
  const el = document.getElementById('settingTheme');
  if (el) el.value = next;
  persist();
}

/** GÃ©nÃ¨re une URL favicon Ã  partir d'une URL de site */
function guessFavicon(url) {
  try { return new URL(url).origin + '/favicon.ico'; } catch (e) { return ''; }
}

// Construit le HTML du cartouche PS
function psCartouche(ps, event) {
  const dateStr = ps.updatedAt ? new Date(ps.updatedAt).toLocaleString('fr-FR', {dateStyle:'short',timeStyle:'short'}) : 'â€”';
  return `<div class="ps-cartouche"><table class="table"><thead><tr><th>Date / heure</th><th>Statut</th><th>Classification</th><th>Auteur</th><th>ID Synergi</th></tr></thead><tbody><tr><td>${esc(dateStr)}</td><td>${esc(ps.status||'')}</td><td>${esc(ps.classification||'')}</td><td>${esc(ps.author||'')}</td><td>${esc(event?.synergi||'')}</td></tr></tbody></table></div>`;
}

// Construit le HTML du bilan victimes
function bilanMini(ps) {
  const b = ps.bilan || {};
  const notes = b.notes ? `<div class="source-note" style="margin-top:.5rem">${nl2br(b.notes)}</div>` : '';
  return `<table class="bilan-mini"><thead><tr><th>DCD</th><th>UA</th><th>UR</th><th>IMP</th></tr></thead><tbody><tr><td>${esc(b.dcd||'0')}</td><td>${esc(b.ua||'0')}</td><td>${esc(b.ur||'0')}</td><td>${esc(b.impliques||'0')}</td></tr></tbody></table>${notes}`;
}

// Construit le HTML des sources PS (transcription + audio)
function psSourcesHtml(ps) {
  const parts = [];
  if (ps.transcript?.trim()) parts.push(`<div><strong>Transcription textuelle</strong><div class="source-note">${nl2br(ps.transcript)}</div></div>`);
  if (ps.audioData) parts.push(`<div style="margin-top:${ps.transcript?.trim() ? '.75rem' : '0'}"><strong>Source audio</strong><audio controls src="${esc(ps.audioData)}"></audio></div>`);
  return parts.join('');
}

const STABLE_HTML_TEMPLATE_DEFAULTS = {
  point_situation_detail: `
    <div class="ps-sheet" style="max-width:52rem">
      <div class="ps-header">
        <img class="logo" src="{{logo}}" alt="">
        <div class="ps-title"><h2>{{title}}</h2><p>{{subtitle}}</p></div>
        <div class="spacer"></div>
      </div>
      {{cartouche}}
      <table class="ps-detail-table">
        <tr><td style="width:24%"><div class="ps-section-title">Situation gÃ©nÃ©rale</div></td><td><div class="ps-content">{{situation}}</div></td></tr>
        <tr><td><div class="ps-section-title">Bilan</div></td><td><div class="ps-content">{{bilan}}</div></td></tr>
        <tr><td><div class="ps-section-title">Moyens engagÃ©s</div></td><td><div class="ps-content">{{means}}</div></td></tr>
        <tr><td><div class="ps-section-title">Mesures prises</div></td><td><div class="ps-content">{{measures}}</div></td></tr>
        <tr><td><div class="ps-section-title">Points d'attention</div></td><td><div class="ps-content">{{attention}}</div></td></tr>
        <tr><td><div class="ps-section-title">Communication</div></td><td><div class="ps-content">{{communication}}</div></td></tr>
        {{image_row}}
        {{sources_row}}
      </table>
      {{signature}}
    </div>
  `,
  point_situation_focus: `
    <div class="ps-sheet focus-mode" style="max-width:74rem">
      <div class="ps-header">
        <img class="logo" src="{{logo}}" alt="">
        <div class="ps-title"><h2>{{title}}</h2><p>{{subtitle}}</p></div>
        <div class="spacer"></div>
      </div>
      {{cartouche}}
      <div class="focus-grid">
        <div class="focus-col">
          <div class="focus-box"><div class="focus-label">Bilan</div><div class="focus-body">{{bilan}}</div></div>
          <div class="focus-box"><div class="focus-label">Moyens</div><div class="focus-body">{{means}}</div></div>
        </div>
        <div class="focus-center">
          <div class="focus-box"><div class="focus-label">Situation gÃ©nÃ©rale</div><div class="focus-body">{{situation}}</div></div>
          <div class="focus-box"><div class="focus-label">Cartographie</div><div class="focus-map">{{image}}</div></div>
          <div class="focus-box"><div class="focus-label">Mesures prises</div><div class="focus-body">{{measures}}</div></div>
        </div>
        <div class="focus-col focus-right">
          <div class="focus-box"><div class="focus-label">Points d'attention</div><div class="focus-body">{{attention}}</div></div>
          <div class="focus-box"><div class="focus-label">Communication</div><div class="focus-body">{{communication}}</div></div>
        </div>
      </div>
      {{signature}}
    </div>
  `,
  command_message: `
    <div class="command-sheet {{exerciseClass}}">
      <div class="exercise-banner" style="{{exerciseDisplay}}">EXERCICE - EXERCICE - EXERCICE</div>
      <div class="cmd-header">
        <img class="cmd-logo" src="{{logo}}" alt="">
        <div class="cmd-headtext">
          <div style="font-size:.875rem;line-height:1.45;text-align:left;margin-bottom:.5rem">
            <div><strong>SIRACEDPC</strong></div>
            <div>TÃ©lÃ©phone : {{contactPhone}}</div>
            <div>TÃ©lÃ©copie : {{contactFax}}</div>
            <div>Courriel : {{contactEmail}}</div>
            <div>Audio-conf. : {{contactAudioConf}}</div>
          </div>
          <div class="meta-line"><table class="table"><tbody><tr><th>Date</th><th>Heure</th></tr><tr><td>{{date}}</td><td>{{time}}</td></tr></tbody></table></div>
          <p class="cmd-redtitle">{{typeLabel}}</p>
          <h2>{{eventTitle}}</h2>
          <div class="help">Site / lieu de l'Ã©vÃ©nement : {{site}}</div>
        </div>
      </div>
      <div class="cmd-urgent">MESSAGE URGENT</div>
      <p class="cmd-autotext">{{autoText}}</p>
      <div class="meta-line"><table class="table"><thead><tr><th>Dispositif de rÃ©fÃ©rence</th><th>Heure d'activation</th><th>Localisation du PCO</th></tr></thead><tbody><tr><td>{{reference}}</td><td>{{activation}}</td><td>{{pcoLocation}}</td></tr></tbody></table></div>
      <table class="table"><tbody>
        <tr><th style="width:78%">Mesures</th><th>Valeur</th></tr>
        {{measuresRows}}
      </tbody></table>
      <div style="margin-top:1rem"><table class="table"><thead><tr><th>Services / entitÃ©s</th><th>COD</th><th>PCO</th></tr></thead><tbody>{{servicesRows}}</tbody></table></div>
      <div style="margin-top:1.25rem;display:flex;justify-content:flex-end;text-align:right">{{signature}}</div>
      <div style="margin-top:.75rem;text-align:right"><strong>{{originalSigned}}</strong></div>
      <div class="exercise-banner" style="margin-top:1rem;{{exerciseDisplay}}">EXERCICE - EXERCICE - EXERCICE</div>
    </div>
  `,
  main_courante: `
    <div class="ps-sheet" style="max-width:52rem">
      <div class="ps-header" style="margin-bottom:.5rem">
        <img class="logo" src="{{logo}}" alt="">
        <div class="ps-title"><h2>{{eventTitle}}</h2><p>{{eventMeta}}</p></div>
        <div class="spacer"></div>
      </div>
      <table class="table">
        <thead><tr><th style="width:13rem">Date / heure</th><th style="width:10rem">Auteur</th><th>EntrÃ©e</th></tr></thead>
        <tbody>{{entriesRows}}</tbody>
      </table>
      {{signature}}
    </div>
  `
};

function ensureOperationalHtmlTemplates() {
  if (!window.SICODPdfTemplates?.setHtmlTemplate) return;
  Object.entries(STABLE_HTML_TEMPLATE_DEFAULTS).forEach(([key, html]) => {
    const existing = window.SICODPdfTemplates.getHtmlTemplate(state, key);
    const source = String(existing?.html || '');
    if (!source || /Bloc 1|Bloc 2|<header>\s*<h1>/.test(source)) {
      window.SICODPdfTemplates.setHtmlTemplate(state, key, html.trim());
    }
  });
}

function extractTemplateBody(html) {
  const source = String(html || '').trim();
  const match = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (match ? match[1] : source).trim();
}

function extractTemplateHead(html) {
  const source = String(html || '').trim();
  const match = source.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return (match ? match[1] : '').trim();
}

function templateLooksLikeDocument(html) {
  return /<html[\s>]/i.test(String(html || ''));
}

function fillHtmlTemplate(html, tokens) {
  return String(html || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(tokens, key) ? String(tokens[key] ?? '') : '';
  });
}

function getStoredHtmlTemplateRaw(key) {
  ensureOperationalHtmlTemplates();
  const template = window.SICODPdfTemplates?.getHtmlTemplate(state, key);
  return String(template?.html || STABLE_HTML_TEMPLATE_DEFAULTS[key] || '');
}

function renderStoredHtmlTemplate(key, tokens) {
  const body = extractTemplateBody(getStoredHtmlTemplateRaw(key));
  return fillHtmlTemplate(body, tokens || {});
}

function buildTemplateHtmlDocument(key, tokens, options = {}) {
  const raw = getStoredHtmlTemplateRaw(key);
  const rendered = fillHtmlTemplate(raw, tokens || {});
  const baseHref = document.baseURI || window.location.href;
  const stylesheetHref = document.querySelector('link[href*="assets/app.css"]')?.href || new URL('assets/app.css', baseHref).href;
  const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  const pageWidth = orientation === 'landscape' ? '297mm' : '210mm';
  const pageHeight = orientation === 'landscape' ? '210mm' : '297mm';
  const head = extractTemplateHead(rendered);
  const body = extractTemplateBody(rendered);
  const shellStyle = `<style>
    html,body{margin:0;padding:0;background:#ffffff;color:#161616}
    body{overflow:auto}
    .template-export-stage{padding:1.25rem;min-height:100vh;box-sizing:border-box;display:flex;justify-content:center;align-items:flex-start;background:#f6f6f6}
    .template-export-stage .document-page{width:${pageWidth};min-height:${pageHeight};margin:0 auto;background:#ffffff;box-shadow:none}
    @media print{.template-export-stage{padding:0;background:#ffffff}}
  </style>`;
  if (templateLooksLikeDocument(raw)) {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><base href="${esc(baseHref)}">${head}${shellStyle}</head><body><div class="template-export-stage"><div class="document-page">${body}</div></div></body></html>`;
  }
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(options.title || key)}</title><base href="${esc(baseHref)}"><link rel="stylesheet" href="${esc(stylesheetHref)}">${shellStyle}</head><body><div class="template-export-stage"><div class="document-page">${body}</div></div></body></html>`;
}


function mountStoredHtmlTemplatePreview(container, key, tokens, options = {}) {
  if (!container) return;
  const iframe = document.createElement('iframe');
  iframe.className = `template-preview-frame ${options.className || ''}`.trim();
  iframe.setAttribute('title', options.title || 'AperÃ§u du document');
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.srcdoc = buildTemplateHtmlDocument(key, tokens || {}, options);
  container.innerHTML = '';
  container.appendChild(iframe);
}

async function waitForFrameAssets(frameDocument) {
  const fontPromise = frameDocument?.fonts?.ready
    ? frameDocument.fonts.ready.catch(() => undefined)
    : Promise.resolve();
  const images = Array.from(frameDocument?.images || []).filter((img) => !img.complete);
  const imagePromises = images.map((img) => new Promise((resolve) => {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
  }));
  await Promise.all([fontPromise, ...imagePromises]);
  await new Promise((resolve) => setTimeout(resolve, 120));
}

async function exportHtmlTemplatePdf(key, tokens, fileName, options = {}) {
  if (!window.jspdf?.jsPDF || !window.html2canvas) {
    showToast("Le moteur d'export HTML vers PDF n'est pas disponible.", 'error');
    return;
  }
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = options.orientation === 'landscape' ? '1240px' : '920px';
  iframe.style.height = '2000px';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = '0';
  iframe.srcdoc = buildTemplateHtmlDocument(key, tokens || {}, options);
  document.body.appendChild(iframe);
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Le rendu du document a expirÃ©.')), 12000);
      iframe.onload = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDocument) throw new Error("Le document HTML n'a pas pu Ãªtre initialisÃ©.");
    await waitForFrameAssets(frameDocument);
    const target = frameDocument.querySelector('.document-page') || frameDocument.body;
    const doc = new window.jspdf.jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: options.orientation === 'landscape' ? 'landscape' : 'portrait'
    });
    await new Promise((resolve, reject) => {
      try {
        doc.html(target, {
          margin: [0, 0, 0, 0],
          autoPaging: 'text',
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: Math.max(target.scrollWidth, target.clientWidth || 0),
            windowHeight: Math.max(target.scrollHeight, target.clientHeight || 0)
          },
          callback: (pdf) => {
            pdf.save(fileName || `${slugify(options.title || key || 'document')}.pdf`);
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    showToast(`Export PDF impossible : ${error.message || String(error)}`, 'error');
  } finally {
    iframe.remove();
  }
}

function openHtmlTemplatePdf(key, tokens, title = 'document', options = {}) {
  return exportHtmlTemplatePdf(
    key,
    tokens,
    `${slugify(title || key || 'document')}.pdf`,
    Object.assign({ title }, options)
  );
}

function buildPSHtmlTokens(ps) {
  const event = byId(state.events, ps.eventId);
  const means = ps.means ?? ps.moyens ?? '';
  const measures = ps.measures ?? ps.mesures ?? '';
  const attention = ps.attention ?? ps.points ?? '';
  const title = `POINT DE SITUATION NÂ° ${ps.number}`;
  return {
    logo: currentLogoSrc(),
    title: esc(title),
    subtitle: esc(ps.title || getEventTitle(ps.eventId) || ''),
    cartouche: psCartouche(ps, event),
    situation: nl2br(ps.situation || ''),
    bilan: bilanMini(ps),
    means: nl2br(means),
    measures: nl2br(measures),
    attention: nl2br(attention),
    communication: nl2br(ps.communication || '') + (ps.format === 'focus' ? psSourcesHtml(ps) : ''),
    image: ps.image ? `<img src="${ps.image}" alt="Visuel">` : '<span class="note">Aucun visuel joint</span>',
    image_row: ps.image ? `<tr><td><div class="ps-section-title">Visuel associÃ©</div></td><td><div class="ps-content"><img src="${ps.image}" alt="Visuel" style="max-width:100%;max-height:18rem;width:auto;height:auto;display:block;margin:0 auto;object-fit:contain">${ps.imageCaption ? `<div class="source-note">${esc(ps.imageCaption)}</div>` : ''}</div></td></tr>` : '',
    sources_row: (ps.audioData || ps.transcript) ? `<tr><td><div class="ps-section-title">Sources</div></td><td><div class="ps-content">${psSourcesHtml(ps)}</div></td></tr>` : '',
    signature: renderPSSignatureHtml()
  };
}

function buildCommandHtmlTokens(d) {
  const contactPhone = state.settings.commandPhone || '04 84 35 40 00 (standard)';
  const contactFax = state.settings.commandFax || '04 84 35 41 85';
  const contactEmail = state.settings.commandEmail || 'pref-pccrise-13@bouches-du-rhone.gouv.fr';
  const contactAudioConf = state.settings.commandAudioConf || '01 43 12 42 30 puis le 13603 suivi de #';
  const sig = getCommandSignatureConfig();
  const signature = shouldApplyPdfSignature('command')
    ? (sig.mode === 'delegation'
      ? `<div><strong>Pour le prÃ©fet, par dÃ©lÃ©gation</strong><div>${esc(sig.role || '')}</div><div>${esc(sig.name || '')}</div></div>`
      : `<div><strong>Le prÃ©fet</strong><div>${esc(sig.name || '')}</div></div>`)
    : '';
  const measuresRows = [
    ['Activation de la cellule de suivi', mark(d.suivi)],
    ['Prise de direction des opÃ©rations / activation du COD', mark(d.cod)],
    ['Activation du PCO', mark(d.pco)],
    ['Activation du plan de rÃ©fÃ©rence', mark(d.planActive) + (d.plan ? ` â€” ${esc(d.plan)}` : '')],
    ['Mise en oeuvre limitÃ©e Ã  certaines mesures', mark(d.limited)],
    ["Activation d'une alerte sirÃ¨ne", mark(d.siren) + (d.sirenLabel ? ` â€” ${esc(d.sirenLabel)}` : '')]
  ].map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join('');
  const servicesRows = (d.services || []).map(s => `<tr><td>${esc(s.name)}</td><td>${mark(s.cod)}</td><td>${mark(s.pco)}</td></tr>`).join('');
  return {
    exerciseClass: d.exercise ? 'exercise' : '',
    exerciseDisplay: d.exercise ? 'display:block' : 'display:none',
    logo: currentLogoSrc(),
    contactPhone: esc(contactPhone),
    contactFax: esc(contactFax),
    contactEmail: esc(contactEmail),
    contactAudioConf: esc(contactAudioConf),
    date: esc(d.date || ''),
    time: esc(d.time || ''),
    typeLabel: esc((d.typeLabel || '').toUpperCase()),
    eventTitle: esc(d.event || 'Ã‰VÃ‰NEMENT Ã€ RENSEIGNER'),
    site: esc(d.site || ''),
    autoText: esc(d.autoText || ''),
    reference: esc(d.reference || ''),
    activation: esc(d.activation || ''),
    pcoLocation: esc(d.pcoLocation || ''),
    measuresRows,
    servicesRows,
    signature,
    originalSigned: d.originalSigned ? 'Original signÃ©' : ''
  };
}

function buildEventLogHtmlTokens(eventId) {
  const e = byId(state.events, eventId || state.currentEventId);
  const items = getEventTimelineItems(e?.id);
  const signature = shouldApplyPdfSignature('event')
    ? (() => {
        const sig = getEventSignatureConfig();
        return sig.mode === 'delegation'
          ? `<div class="ps-signature"><div class="ps-signature-box"><div class="sig-line1">Pour le prÃ©fet, par dÃ©lÃ©gation</div><div class="sig-line2">${esc(sig.role || '')}</div><div class="sig-line2">${esc(sig.name || '')}</div></div></div>`
          : `<div class="ps-signature"><div class="ps-signature-box"><div class="sig-line1">Le prÃ©fet</div><div class="sig-line2">${esc(sig.name || '')}</div></div></div>`;
      })()
    : '';
  return {
    logo: currentLogoSrc(),
    eventTitle: esc(e?.title || ''),
    eventMeta: esc([e?.type || 'â€”', e?.location || 'â€”', e?.level || 'â€”'].join(' Â· ')),
    entriesRows: items.length
      ? items.map(item => `<tr><td>${formatDateTimeValueFR(item.date)}</td><td>${esc(item.author || 'SIRACEDPC')}</td><td><div class="timeline-title">${esc(item.title || '')}</div><div>${nl2br(item.detail || '')}</div></td></tr>`).join('')
      : '<tr><td colspan="3"><p class="help">Aucune entrÃ©e de main courante.</p></td></tr>',
    signature
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 5. NAVIGATION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function goPage(page) {
  if (isAuthLocked()) return;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page || (page === 'event-archives' && b.dataset.page === 'events')));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  if (page === 'fiches') renderFiches();
  if (page === 'ps') renderPSList();
  if (page === 'events') renderEvents();
  if (page === 'event-archives') renderEventArchives();
  populateEventTypeSelect(document.getElementById('eventType')?.value || '');
  populateCommuneDatalist();
  if (page === 'directory') renderDirectory();
  if (page === 'tools') renderTools();
  if (page === 'settings') loadSettingsForm();
  if (page === 'planning') { ensurePlanningStatsUI(); renderPlanning(); }
  if (page === 'duty') { ensureDutyStatsUI(); renderDutyCalendar(); renderDutyAvailabilityList(); renderDutySchedule(); }
}

document.querySelectorAll('.nav-btn').forEach(btn =>
  btn.addEventListener('click', () => goPage(btn.dataset.page))
);

function ensureEventArchivesPage() {
  const main = document.querySelector('main.main');
  if (!main || document.getElementById('page-event-archives')) return;
  main.insertAdjacentHTML('beforeend', `
    <section class="page" id="page-event-archives">
      <div class="page-inner">
        <div class="page-header">
          <div><h1>Archives des Ã©vÃ©nements</h1></div>
          <div class="event-page-actions">
            <button class="fr-btn secondary" type="button" onclick="goPage('events')">Retour aux Ã©vÃ©nements</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h2 class="card-title">Ã‰vÃ©nements archivÃ©s</h2></div>
          <div class="card-body">
            <div class="events-toolbar">
              <input class="list-search" id="eventArchiveSearch" type="search" placeholder="Rechercher un Ã©vÃ©nement archivÃ©â€¦" oninput="renderEventArchives()">
            </div>
            <div class="grid-2" id="eventArchivesList"></div>
          </div>
        </div>
      </div>
    </section>
  `);
}

function ensureEventPageEnhancements() {
  const pageHeader = document.querySelector('#page-events .page-header');
  if (pageHeader && !pageHeader.querySelector('.event-page-actions')) {
    const primaryButton = pageHeader.querySelector('.fr-btn');
    const wrap = document.createElement('div');
    wrap.className = 'event-page-actions';
    wrap.innerHTML = `<button class="fr-btn secondary" type="button" onclick="goPage('event-archives')">Archives</button>`;
    if (primaryButton) {
      primaryButton.insertAdjacentElement('beforebegin', wrap);
      wrap.appendChild(primaryButton);
    } else {
      pageHeader.appendChild(wrap);
    }
  }
  const cardBody = document.querySelector('#page-events .card .card-body');
  if (cardBody && !document.getElementById('eventSearch')) {
    cardBody.insertAdjacentHTML('afterbegin', `
      <div class="events-toolbar">
        <input class="list-search" id="eventSearch" type="search" placeholder="Rechercher par libellÃ©, type, commune, niveau ou ID Synergiâ€¦" oninput="renderEvents()">
      </div>
    `);
  }
  const archivedCard = Array.from(document.querySelectorAll('#page-events .card')).find((card) =>
    card.querySelector('.card-title')?.textContent?.trim() === 'Ã‰vÃ©nements archivÃ©s'
  );
  if (archivedCard) archivedCard.remove();
  ensureEventArchivesPage();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6. MODULE DASHBOARD
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderDashboard() {
  refreshDashboardBanner();
  const kpiEvents = document.getElementById('kpiEvents');
  const kpiPS = document.getElementById('kpiPS');
  const kpiArchived = document.getElementById('kpiArchived');
  const kpiPlansTotal = document.getElementById('kpiPlansTotal');
  const kpiPlansUpToDate = document.getElementById('kpiPlansUpToDate');
  const kpiPlansTodo = document.getElementById('kpiPlansTodo');
  const kpiPlansInProgress = document.getElementById('kpiPlansInProgress');

  const planItems = getActiveItems(state.planItems);
  const activeEvents = getActiveItems(state.events).filter(e => e.status !== 'ArchivÃ©');
  const archivedEvents = (state.events || []).filter(e => e && !e.deletedAt && e.status === 'ArchivÃ©');
  const activePS = getActiveItems(state.ps);
  const planStatusNorm = (value) => String(value || '').trim().toLowerCase();
  const isPlanUpToDate = (p) => planStatusNorm(p?.status) === 'a jour' || planStatusNorm(p?.status) === 'Ã  jour';
  const isPlanTodo = (p) => planStatusNorm(p?.status) === 'a programmÃ©' || planStatusNorm(p?.status) === 'Ã  programmer' || planStatusNorm(p?.status) === 'a programmer';
  const isPlanInProgress = (p) => planStatusNorm(p?.status) === 'en cours';

  if (kpiEvents) kpiEvents.textContent = activeEvents.length;
  if (kpiPS) kpiPS.textContent = activePS.length;
  if (kpiArchived) kpiArchived.textContent = archivedEvents.length;
  if (kpiPlansTotal) kpiPlansTotal.textContent = planItems.length;
  if (kpiPlansUpToDate) kpiPlansUpToDate.textContent = planItems.filter(isPlanUpToDate).length;
  if (kpiPlansTodo) kpiPlansTodo.textContent = planItems.filter(isPlanTodo).length;
  if (kpiPlansInProgress) kpiPlansInProgress.textContent = planItems.filter(isPlanInProgress).length;

  const dashEvents = document.getElementById('dashboardEvents');
  if (dashEvents) {
    const active = activeEvents.slice(0, 4);
    dashEvents.innerHTML = active.length
      ? active.map(e => `<div class="event-card"><h3>${esc(e.title)}</h3><div class="event-meta"><span>${esc(e.type||'')}</span><span>${esc(e.location||'')}</span><span>${badge(e.status)}</span></div></div>`).join('')
      : '<p class="help">Aucun Ã©vÃ©nement actif.</p>';
  }

  const dashPS = document.getElementById('dashboardPS');
  if (dashPS) {
    const latestPS = [...activePS].sort((a, b) => (b.updatedAt||'').localeCompare(a.updatedAt||'')).slice(0, 5);
    dashPS.innerHTML = latestPS.length
      ? `<table class="table"><thead><tr><th>NÂ°</th><th>Ã‰vÃ©nement</th><th>Auteur</th><th>Statut</th></tr></thead><tbody>${latestPS.map(ps => `<tr><td>${esc(ps.number)}</td><td>${esc(getEventTitle(ps.eventId))}</td><td>${esc(ps.author)}</td><td>${badge(ps.status)}</td></tr>`).join('')}</tbody></table>`
      : '<p class="help">Aucun point de situation.</p>';
  }

  const dashPlans = document.getElementById('dashboardPlans');
  if (dashPlans) {
    const inProgress = planItems.filter(p => !isPlanUpToDate(p)).slice(0, 5);
    dashPlans.innerHTML = inProgress.length
      ? `<table class="table"><thead><tr><th>Item</th><th>PrioritÃ©</th><th>Statut</th></tr></thead><tbody>${inProgress.map(p => `<tr><td>${esc(p.item||'')}</td><td>${esc(p.priority||'')}</td><td>${badge(p.status||'')}</td></tr>`).join('')}</tbody></table>`
      : '<p class="help">Aucun plan en attente.</p>';
  }

  const dashDuty = document.getElementById('dashboardDutyPair');
  if (dashDuty) {
    const today = todayISO();
    const week = (state.dutySchedule || []).find(w => w.start <= today && w.end >= today);
    if (week) {
      const roles = getDynamicList('dutyRoles');
      dashDuty.innerHTML = `<table class="table"><tbody>
        <tr><th>${esc(roles[0]||'Astreinte 1')}</th><td>${esc(week.agent1?.name || 'â€”')}</td></tr>
        <tr><th>${esc(roles[1]||'Astreinte 2')}</th><td>${esc(week.agent2?.name || 'â€”')}</td></tr>
      </tbody></table><p class="help">Semaine du ${esc(formatDateFR(week.start))} au ${esc(formatDateFR(week.end))}</p>`;
    } else {
      dashDuty.innerHTML = '<p class="help">Aucun planning gÃ©nÃ©rÃ© pour cette semaine.</p>';
    }
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 7. MODULE Ã‰VÃ‰NEMENTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


const DEFAULT_EVENT_TYPES = ['Accident','Feu','IntempÃ©ries','Inondation','Mouvement social','Pollution','Risque sanitaire','SÃ©curitÃ© publique','Transport','Autre'];
const COMMUNES_13 = ['13100 - Aix-en-Provence','13190 - Allauch','13980 - Alleins','13200 - Arles','13400 - Aubagne','13930 - Aureille','13390 - Auriol','13121 - Aurons','13330 - La Barben','13570 - Barbentane','13520 - Les Baux-de-Provence','13100 - Beaurecueil','13720 - BelcodÃ¨ne',"13130 - Berre-l'Ã‰tang",'13320 - Bouc-Bel-Air','13720 - La Bouilladisse','13150 - Boulbon','13440 - Cabannes','13480 - CabriÃ¨s','13950 - Cadolive','13470 - Carnoux-en-Provence','13620 - Carry-le-Rouet','13260 - Cassis','13600 - Ceyreste','13350 - Charleval','13790 - ChÃ¢teauneuf-le-Rouge','13220 - ChÃ¢teauneuf-les-Martigues','13160 - ChÃ¢teaurenard','13600 - La Ciotat','13250 - Cornillon-Confoux','13111 - Coudoux','13780 - Cuges-les-Pins','13112 - La Destrousse','13510 - Ã‰guilles','13820 - EnsuÃ¨s-la-Redonne','13810 - EygaliÃ¨res','13430 - EyguiÃ¨res','13630 - Eyragues','13580 - La Fare-les-Oliviers','13990 - Fontvieille','13270 - Fos-sur-Mer','13710 - Fuveau','13120 - Gardanne','13420 - GÃ©menos','13180 - Gignac-la-Nerthe','13450 - Grans','13690 - Graveson','13850 - GrÃ©asque','13800 - Istres','13490 - Jouques','13113 - Lamanon','13410 - Lambesc','13680 - LanÃ§on-Provence','13910 - Maillane','13370 - Mallemort','13700 - Marignane','13000 - Marseille','13500 - Martigues','13103 - Mas-Blanc-des-Alpilles','13520 - Maussane-les-Alpilles','13650 - Meyrargues','13590 - Meyreuil','13105 - Mimet','13140 - Miramas','13940 - MollÃ©gÃ¨s','13890 - MouriÃ¨s','13550 - Noves','13660 - Orgon','13520 - Paradou','13330 - PÃ©lissanne','13821 - La Penne-sur-Huveaune','13170 - Les Pennes-Mirabeau','13790 - Peynier','13124 - Peypin','13860 - Peyrolles-en-Provence','13380 - Plan-de-Cuques',"13750 - Plan-d'Orgon",'13110 - Port-de-Bouc','13230 - Port-Saint-Louis-du-RhÃ´ne','13114 - Puyloubier','13610 - Le Puy-Sainte-RÃ©parade','13340 - Rognac','13840 - Rognes','13870 - Rognonas',"13640 - La Roque-d'AnthÃ©ron",'13830 - Roquefort-la-BÃ©doule','13360 - Roquevaire','13790 - Rousset','13740 - Le Rove','13670 - Saint-Andiol','13100 - Saint-Antonin-sur-Bayon','13760 - Saint-Cannat','13250 - Saint-Chamas','13610 - Saint-EstÃ¨ve-Janson','13103 - Saint-Ã‰tienne-du-GrÃ¨s','13100 - Saint-Marc-Jaumegarde','13310 - Saint-Martin-de-Crau','13920 - Saint-Mitre-les-Remparts','13115 - Saint-Paul-lÃ¨s-Durance','13150 - Saint-Pierre-de-MÃ©zoargues','13210 - Saint-RÃ©my-de-Provence','13119 - Saint-Savournin','13730 - Saint-Victoret','13460 - Saintes-Maries-de-la-Mer','13300 - Salon-de-Provence','13960 - Sausset-les-Pins','13560 - SÃ©nas','13240 - SeptÃ¨mes-les-Vallons','13109 - Simiane-Collongue','13150 - Tarascon','13100 - Le Tholonet','13530 - Trets','13126 - Vauvenargues','13880 - Velaux','13770 - Venelles','13122 - Ventabren','13116 - VernÃ¨gues','13670 - VerquiÃ¨res','13127 - Vitrolles'];
function getEventTypeOptions(){ const configured = (state.settings?.dynamicLists||{}).eventTypes; return Array.isArray(configured) && configured.length ? configured : DEFAULT_EVENT_TYPES.slice(); }
function populateEventTypeSelect(selected){ const el=document.getElementById('eventType'); if(!el) return; setSelectOptions(el,getEventTypeOptions(),selected||''); }
function populateCommuneDatalist(){ const list=document.getElementById('communes13List'); if(!list) return; const extra=getActiveItems(state.events).map(e=>e.location).filter(Boolean); const items=[...new Set([...COMMUNES_13,...extra])].sort((a,b)=>a.localeCompare(b,'fr')); list.innerHTML=items.map(v=>`<option value="${esc(v)}"></option>`).join(''); }
function isEventArchived(eventId){ const e=byId(state.events,eventId); return !!e && e.status==='ArchivÃ©'; }
function nowFR(){ return new Date().toLocaleString('fr-FR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function formatDateTimeValueFR(iso){ const d=new Date(iso); if(Number.isNaN(d.getTime())) return esc(iso||''); return d.toLocaleString('fr-FR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }



function openEventForm(id) {
  const e = id ? byId(state.events, id) : null;
  document.getElementById('eventId').value = e?.id || '';
  document.getElementById('eventTitle').value = e?.title || '';
  populateEventTypeSelect(e?.type || '');
  document.getElementById('eventSynergi').value = e?.synergi || '';
  document.getElementById('eventLocation').value = e?.location || '';
  document.getElementById('eventLevel').value = e?.level || 'Veille';
  document.getElementById('eventStatus').value = e?.status || 'Actif';
  populateCommuneDatalist();
  document.getElementById('eventDialog').showModal();
}

function saveEvent() {
  const idEl = document.getElementById('eventId');
  const titleEl = document.getElementById('eventTitle');
  if (!titleEl || !titleEl.value.trim()) { showToast('Le libellÃ© est requis.', 'error'); return; }
  const id = idEl?.value || uid('evt');
  const existing = byId(state.events, id);
  if (existing && existing.status === 'ArchivÃ©') { showToast('Un Ã©vÃ©nement archivÃ© ne peut pas Ãªtre modifiÃ©.', 'error'); return; }
  const typeSnapshot = getReferenceSnapshot('eventTypes', document.getElementById('eventType').value.trim());
  const data = {
    id,
    title: titleEl.value.trim(),
    type: typeSnapshot.label,
    typeId: typeSnapshot.id,
    typeLabelSnapshot: typeSnapshot.label,
    synergi: document.getElementById('eventSynergi').value.trim(),
    location: document.getElementById('eventLocation').value.trim(),
    level: document.getElementById('eventLevel').value,
    status: document.getElementById('eventStatus').value,
    updatedAt: new Date().toISOString(),
    logEntries: existing?.logEntries || []
  };
  if (existing) Object.assign(existing, data);
  else state.events.unshift(data);
  persist();
  document.getElementById('eventDialog').close();
  renderAll();
}

function archiveEvent(id) {
  const e = byId(state.events, id);
  if (!e) return;
  e.status = 'ArchivÃ©';
  e.updatedAt = new Date().toISOString();
  if (state.currentEventId === id) state.currentEventId = null;
  persist();
  renderAll();
}

function reactivateEvent(id) {
  const e = byId(state.events, id);
  if (!e) return;
  e.status = 'Actif';
  e.updatedAt = new Date().toISOString();
  persist();
  renderAll();
}

async function deleteEvent(id) {
  if (!await confirmAsync('Supprimer cet Ã©vÃ©nement et les points de situation rattachÃ©s ?')) return;
  window.SICODDataModel?.archiveRecord(state.events, id);
  getActiveItems(state.ps).filter(ps => ps.eventId === id).forEach(ps => {
    window.SICODDataModel?.archiveRecord(state.ps, ps.id);
  });
  if (state.currentEventId === id) state.currentEventId = null;
  persist();
  renderAll();
}

function openEvent(id) {
  if (state.currentEventId === id) {
    state.currentEventId = null;
    renderEvents();
    return;
  }
  const e = byId(state.events, id);
  if (!e) return;
  state.currentEventId = id;
  renderEvents();
}

function openEventEntryForm() {
  const eventId = state.currentEventId;
  const e = byId(state.events, eventId);
  if (!e) { showToast('SÃ©lectionnez un Ã©vÃ©nement.', 'error'); return; }
  if (e.status === 'ArchivÃ©') { showToast('Un Ã©vÃ©nement archivÃ© ne peut pas Ãªtre enrichi.', 'error'); return; }
  document.getElementById('eventLogEventId').value = eventId;
  document.getElementById('eventLogDateTime').value = nowFR();
  document.getElementById('eventLogAuthor').value = 'SIRACEDPC';
  document.getElementById('eventLogTitle').value = '';
  document.getElementById('eventLogDetail').value = '';
  document.getElementById('eventEntryDialog').showModal();
}

function saveEventLogEntry() {
  const eventId = document.getElementById('eventLogEventId').value;
  const e = byId(state.events, eventId);
  if (!e) return;
  if (e.status === 'ArchivÃ©') { showToast('Un Ã©vÃ©nement archivÃ© ne peut pas Ãªtre enrichi.', 'error'); return; }
  const title = (document.getElementById('eventLogTitle').value || '').trim();
  const detail = (document.getElementById('eventLogDetail').value || '').trim();
  const author = (document.getElementById('eventLogAuthor').value || '').trim() || 'SIRACEDPC';
  if (!title) { showToast('Le titre est requis.', 'error'); return; }
  e.logEntries = Array.isArray(e.logEntries) ? e.logEntries : [];
  e.logEntries.unshift({ id: uid('log'), createdAt: new Date().toISOString(), title, detail, author });
  e.updatedAt = new Date().toISOString();
  persist();
  document.getElementById('eventEntryDialog').close();
  renderEvents();
}

function getEventTimelineItems(eventId) {
  const e = byId(state.events, eventId);
  if (!e) return [];
  const manual = (Array.isArray(e.logEntries) ? e.logEntries : []).map(item => ({
    date: item.createdAt,
    author: item.author || 'SIRACEDPC',
    title: item.title || '',
    detail: item.detail || ''
  }));
  const relatedPS = getActiveItems(state.ps)
    .filter(ps => ps.eventId === eventId && ps.status === 'DiffusÃ©')
    .map(ps => ({
      date: ps.updatedAt || ps.createdAt || new Date().toISOString(),
      author: ps.author || 'SIRACEDPC',
      title: ps.title || `Point de situation ${ps.number || ''}`.trim(),
      detail: `Point de situation ${ps.number ? 'nÂ° ' + ps.number : ''}${ps.status ? ' â€” ' + ps.status : ''}`
    }));
  const commandItems = getActiveItems(state.commandMessages)
    .filter(cmd => cmd.eventId === eventId && cmd.status === 'DiffusÃ©')
    .map(cmd => ({
      date: cmd.updatedAt || cmd.createdAt || new Date().toISOString(),
      author: 'SIRACEDPC',
      title: `${cmd.typeLabel || 'Message de commandement'}${cmd.number ? ' nÂ° ' + cmd.number : ''}`,
      detail: `Message de commandement ${cmd.status.toLowerCase()}`
    }));
  return manual.concat(relatedPS, commandItems).sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
}

function renderEventTimeline(eventId) {
  const card = document.getElementById('eventTimelineCard');
  const header = document.getElementById('eventTimelineHeader');
  const tableWrap = document.getElementById('eventTimelineTable');
  if (!card || !header || !tableWrap) return;
  const e = byId(state.events, eventId || state.currentEventId);
  if (!e) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  header.innerHTML = `<h3>${esc(e.title)}</h3><div class="help">${esc(e.type || 'â€”')} Â· ${esc(e.location || 'â€”')} Â· ${esc(e.level || 'â€”')}</div>`;
  const items = getEventTimelineItems(e.id);
  tableWrap.innerHTML = items.length ? `<table class="table"><thead><tr><th style="width:13rem">Date / heure</th><th style="width:10rem">Auteur</th><th>EntrÃ©e</th></tr></thead><tbody>${items.map(item => `<tr><td>${formatDateTimeValueFR(item.date)}</td><td>${esc(item.author || 'SIRACEDPC')}</td><td><div class="timeline-title">${esc(item.title || '')}</div><div>${nl2br(item.detail || '')}</div></td></tr>`).join('')}</tbody></table>` : '<p class="help">Aucune entrÃ©e de main courante.</p>';
}

function exportEventLogPDF() {
  const eventId = state.currentEventId;
  const e = byId(state.events, eventId);
  if (!e) {
    showToast('SÃ©lectionnez un Ã©vÃ©nement.', 'error');
    return;
  }
  return openHtmlTemplatePdf(
    'main_courante',
    buildEventLogHtmlTokens(eventId),
    `main-courante-${(e.title || 'evenement').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`,
    { orientation: 'portrait' }
  );
}

function renderEvents() {
  ensureEventPageEnhancements();
  const eventList = document.getElementById('eventList');
  if (!eventList) return;

  const active = getActiveItems(state.events).filter(e => e.status !== 'ArchivÃ©');
  const q = (document.getElementById('eventSearch')?.value || '').toLowerCase().trim();
  const filteredActive = q
    ? active.filter(e => [e.title, e.type, e.location, e.level, e.synergi].join(' ').toLowerCase().includes(q))
    : active;

  const tmpl = e => {
    const isOpen = state.currentEventId === e.id;
    const openLabel = isOpen ? 'Fermer' : 'Ouvrir';
    return `<div class="event-card">
      <h3>${esc(e.title)}</h3>
      <div class="event-meta">
        <span>${esc(e.type || '')}</span>
        <span>${esc(e.location || '')}</span>
        <span>${esc(e.level || '')}</span>
        ${e.synergi ? `<span>ID Synergi ${esc(e.synergi)}</span>` : ''}
      </div>
      <div class="event-actions">
        ${e.status === 'ArchivÃ©'
          ? `<button class="fr-btn secondary small" onclick="reactivateEvent('${e.id}')">RÃ©activer</button>
             <button class="fr-btn danger small" onclick="deleteEvent('${e.id}')">Supprimer</button>`
          : `<button class="fr-btn small" onclick="openEvent('${e.id}')">${openLabel}</button>
             <button class="fr-btn secondary small" onclick="openEventForm('${e.id}')">Modifier</button>
             <button class="fr-btn secondary small" onclick="archiveEvent('${e.id}')">Archiver</button>
             <button class="fr-btn danger small" onclick="deleteEvent('${e.id}')">Supprimer</button>`
        }
      </div>
    </div>`;
  };

  eventList.innerHTML = filteredActive.length ? filteredActive.map(tmpl).join('') : (window.SICODUI?.setEmptyState?.('Aucun Ã©vÃ©nement actif. CrÃ©er un premier Ã©vÃ©nement.', 'Nouvel Ã©vÃ©nement', 'openEventForm()') || '<p class="help">Aucun Ã©vÃ©nement actif.</p>');
  updatePSEventSelect();
  populateCommuneDatalist();
  renderEventTimeline(state.currentEventId);
}

function renderEventArchives() {
  ensureEventArchivesPage();
  const archiveList = document.getElementById('eventArchivesList');
  if (!archiveList) return;
  const archived = (state.events || []).filter(e => e && !e.deletedAt && e.status === 'ArchivÃ©');
  const q = (document.getElementById('eventArchiveSearch')?.value || '').toLowerCase().trim();
  const filtered = q
    ? archived.filter(e => [e.title, e.type, e.location, e.level, e.synergi].join(' ').toLowerCase().includes(q))
    : archived;
  const tmpl = e => `<div class="event-card">
    <h3>${esc(e.title)}</h3>
    <div class="event-meta">
      <span>${esc(e.type || '')}</span>
      <span>${esc(e.location || '')}</span>
      <span>${esc(e.level || '')}</span>
      ${e.synergi ? `<span>ID Synergi ${esc(e.synergi)}</span>` : ''}
    </div>
    <div class="event-actions">
      <button class="fr-btn secondary small" onclick="reactivateEvent('${e.id}')">RÃ©activer</button>
      <button class="fr-btn danger small" onclick="deleteEvent('${e.id}')">Supprimer</button>
    </div>
  </div>`;
  archiveList.innerHTML = filtered.length ? filtered.map(tmpl).join('') : '<p class="help">Aucune archive.</p>';
}

function updatePSEventSelect() {
  const psEvent = document.getElementById('psEvent');
  if (!psEvent) return;
  const active = getActiveItems(state.events).filter(e => e.status !== 'ArchivÃ©');
  psEvent.innerHTML = active.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('');
  if (state.currentEventId && active.some(e => e.id === state.currentEventId)) psEvent.value = state.currentEventId;
}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 8. MODULE POINTS DE SITUATION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let psMediaRecorder = null, psChunks = [];

function openPSForm(id) {
  updatePSEventSelect();
  const ps = id ? byId(state.ps, id) : null;
  const draft = !ps ? window.SICODPS?.loadDraft?.() : null;
  const targetEventId = ps?.eventId || state.currentEventId || document.getElementById('psEvent')?.value || '';
  if (targetEventId && isEventArchived(targetEventId)) { showToast("Les points de situation d'un Ã©vÃ©nement archivÃ© ne sont pas modifiables.", 'error'); return; }
  document.getElementById('psId').value = ps?.id || '';

  const psEvent = document.getElementById('psEvent');
  const firstActiveEvent = getActiveItems(state.events).find(e => e.status !== 'ArchivÃ©');
  if (psEvent) psEvent.value = ps?.eventId || draft?.eventId || state.currentEventId || firstActiveEvent?.id || '';

  document.getElementById('psAuthor').value = ps?.author || draft?.author || state.settings?.author || 'SIRACEDPC';
  document.getElementById('psStatus').value = normalizePublishStatus(ps?.status || draft?.status, 'Brouillon');
  document.getElementById('psClassification').value = ps?.classification || draft?.classification || state.settings?.classification || 'Non protÃ©gÃ©';
  document.getElementById('psFormat').value = ps?.format || draft?.format || state.settings?.psFormat || 'detail';
  document.getElementById('psTitle').value = ps?.title || draft?.title || '';
  document.getElementById('psSituation').value = ps?.situation || draft?.situation || '';
  document.getElementById('psAttention').value = ps?.attention ?? ps?.points ?? draft?.attention ?? '';
  document.getElementById('psMeans').value = ps?.means ?? ps?.moyens ?? draft?.means ?? '';
  document.getElementById('psMeasures').value = ps?.measures ?? ps?.mesures ?? draft?.measures ?? '';
  document.getElementById('psCommunication').value = ps?.communication || draft?.communication || '';
  document.getElementById('psImage').value = ps?.image || draft?.image || '';
  document.getElementById('psImageCaption').value = ps?.imageCaption || draft?.imageCaption || '';
  document.getElementById('psTranscript').value = ps?.transcript || draft?.transcript || '';
  document.getElementById('psDcd').value = ps?.bilan?.dcd ?? draft?.bilan?.dcd ?? 0;
  document.getElementById('psUa').value = ps?.bilan?.ua ?? draft?.bilan?.ua ?? 0;
  document.getElementById('psUr').value = ps?.bilan?.ur ?? draft?.bilan?.ur ?? 0;
  document.getElementById('psImpliques').value = ps?.bilan?.impliques ?? draft?.bilan?.impliques ?? 0;
  document.getElementById('psBilanNotes').value = ps?.bilan?.notes || draft?.bilan?.notes || '';

  updatePSImageThumb(ps?.image || '');

  const audioPrev = document.getElementById('psAudioPreview');
  const audioMeta = document.getElementById('psAudioMeta');
  if (audioPrev) {
    audioPrev.src = ps?.audioData || '';
    audioPrev.style.display = ps?.audioData ? 'block' : 'none';
  }
  if (audioMeta) audioMeta.textContent = ps?.audioData ? 'Source audio enregistrÃ©e ou importÃ©e' : 'Aucune source audio';

  const recStatus = document.getElementById('psRecordStatus');
  const recBtn = document.getElementById('psRecordBtn');
  const stopBtn = document.getElementById('psStopBtn');
  if (recStatus) recStatus.textContent = 'Aucun enregistrement en cours.';
  if (recBtn) recBtn.textContent = 'Enregistrer en direct';
  if (stopBtn) stopBtn.style.display = 'none';

  document.getElementById('psDialog').showModal();
  ['psEvent','psAuthor','psStatus','psClassification','psFormat','psTitle','psSituation','psAttention','psMeans','psMeasures','psCommunication','psImage','psImageCaption','psTranscript','psDcd','psUa','psUr','psImpliques','psBilanNotes']
    .forEach((idField) => {
      const el = document.getElementById(idField);
      if (!el) return;
      const persistDraft = () => {
        window.SICODPS?.saveDraft?.({
          eventId: document.getElementById('psEvent')?.value || '',
          author: document.getElementById('psAuthor')?.value || '',
          status: normalizePublishStatus(document.getElementById('psStatus')?.value, 'Brouillon'),
          classification: document.getElementById('psClassification')?.value || '',
          format: document.getElementById('psFormat')?.value || '',
          title: document.getElementById('psTitle')?.value || '',
          situation: document.getElementById('psSituation')?.value || '',
          attention: document.getElementById('psAttention')?.value || '',
          means: document.getElementById('psMeans')?.value || '',
          measures: document.getElementById('psMeasures')?.value || '',
          communication: document.getElementById('psCommunication')?.value || '',
          image: document.getElementById('psImage')?.value || '',
          imageCaption: document.getElementById('psImageCaption')?.value || '',
          transcript: document.getElementById('psTranscript')?.value || '',
          bilan: {
            dcd: document.getElementById('psDcd')?.value || '0',
            ua: document.getElementById('psUa')?.value || '0',
            ur: document.getElementById('psUr')?.value || '0',
            impliques: document.getElementById('psImpliques')?.value || '0',
            notes: document.getElementById('psBilanNotes')?.value || ''
          }
        });
      };
      el.oninput = persistDraft;
      if (el.tagName === 'SELECT') el.onchange = persistDraft;
    });
}

function savePS() {
  const idEl = document.getElementById('psId');
  const psEvent = document.getElementById('psEvent');
  const id = idEl?.value || uid('ps');
  const existing = byId(state.ps, id);
  const eventId = psEvent?.value || '';
  if (eventId && isEventArchived(eventId)) { showToast('Impossible de modifier un point de situation rattachÃ© Ã  un Ã©vÃ©nement archivÃ©.', 'error'); return; }
  const siblings = state.ps.filter(p => p.eventId === eventId && p.id !== id);

  const audioEl = document.getElementById('psAudioPreview');
  // Ne stocker les donnÃ©es audio que si c'est un data URI (pas une blob URL non persistante)
  const audioData = audioEl?.src && audioEl.src.startsWith('data:') ? audioEl.src : (existing?.audioData || '');
  const format = document.getElementById('psFormat').value;
  const template = window.SICODPdfTemplates?.getTemplate(state, 'point_situation', format === 'focus' ? 'focus' : 'detail');

  const data = {
    id, eventId,
    author: (document.getElementById('psAuthor').value || '').trim() || state.settings?.author || 'SIRACEDPC',
    status: normalizePublishStatus(document.getElementById('psStatus').value, 'Brouillon'),
    classification: document.getElementById('psClassification').value,
    format,
    templateId: template?.id || existing?.templateId || '',
    templateVersion: template?.version || existing?.templateVersion || 1,
    title: (document.getElementById('psTitle').value || '').trim() || getEventTitle(eventId),
    number: existing?.number || String(siblings.length + 1),
    updatedAt: new Date().toISOString(),
    situation: (document.getElementById('psSituation').value || '').trim(),
    attention: (document.getElementById('psAttention').value || '').trim(),
    means: (document.getElementById('psMeans').value || '').trim(),
    measures: (document.getElementById('psMeasures').value || '').trim(),
    communication: (document.getElementById('psCommunication').value || '').trim(),
    image: (document.getElementById('psImage').value || '').trim(),
    imageCaption: (document.getElementById('psImageCaption').value || '').trim(),
    transcript: (document.getElementById('psTranscript').value || '').trim(),
    audioData,
    bilan: {
      dcd: document.getElementById('psDcd').value || '0',
      ua: document.getElementById('psUa').value || '0',
      ur: document.getElementById('psUr').value || '0',
      impliques: document.getElementById('psImpliques').value || '0',
      notes: (document.getElementById('psBilanNotes').value || '').trim()
    }
  };

  const validation = window.SICODPS?.validate?.(data);
  if (validation && validation.ok === false) {
    showToast(validation.message, 'error');
    return;
  }

  if (existing) Object.assign(existing, data);
  else state.ps.unshift(data);
  state.selectedPSId = id;
  state.currentEventId = eventId;
  window.SICODPS?.clearDraft?.();
  persist();
  document.getElementById('psDialog').close();
  renderAll();
}

async function deletePS(id) {
  if (!await confirmAsync('Supprimer ce point de situation ?')) return;
  window.SICODDataModel?.archiveRecord(state.ps, id);
  if (state.selectedPSId === id) state.selectedPSId = getActiveItems(state.ps)[0]?.id || null;
  persist();
  renderAll();
}

function selectPS(id) {
  state.selectedPSId = state.selectedPSId === id ? null : id;
  persist();
  renderPSPreview();
  renderPSList();
}

function duplicatePS(id) {
  const src = byId(state.ps, id);
  if (!src) return;
  const siblings = state.ps.filter(p => p.eventId === src.eventId);
  const copy = Object.assign({}, src, {
    id: uid('ps'),
    number: String(siblings.length + 1),
    status: 'Brouillon',
    updatedAt: new Date().toISOString()
  });
  state.ps.unshift(copy);
  state.selectedPSId = copy.id;
  persist();
  renderAll();
  showToast('Point de situation dupliquÃ©.');
}

function filterPSByEvent(eventId) {
  state.currentEventId = eventId || null;
  persist();
  renderPSList();
}

function renderPSList() {
  const psList = document.getElementById('psList');
  if (!psList) return;

  // Populate event filter dropdown
  const psEventFilter = document.getElementById('psEventFilter');
  if (psEventFilter) {
    const events = getActiveItems(state.events);
    psEventFilter.innerHTML = '<option value="">Tous les Ã©vÃ©nements</option>' +
      events.map(e => `<option value="${esc(e.id)}" ${state.currentEventId === e.id ? 'selected' : ''}>${esc(e.title)}</option>`).join('');
  }

  const q = (document.getElementById('psListSearch')?.value || '').toLowerCase().trim();
  const source = getActiveItems(state.ps).filter(isLinkedToActiveEvent);
  if (state.selectedPSId && !source.some((item) => item.id === state.selectedPSId)) {
    state.selectedPSId = null;
  }
  const list = state.currentEventId
    ? source.filter(ps => ps.eventId === state.currentEventId)
    : source;
  const filtered = q
    ? list.filter(ps => [ps.number, ps.author, ps.status, ps.title, getEventTitle(ps.eventId)].join(' ').toLowerCase().includes(q))
    : list;
  const sorted = [...filtered].sort((a,b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  psList.innerHTML = sorted.length
    ? `<table class="table"><thead><tr><th>Horodatage</th><th>NumÃ©ro</th><th>Ã‰vÃ¨nement</th><th>Statut</th><th>Action</th></tr></thead><tbody>${
        sorted.map(ps => `<tr>
          <td>${esc(formatDateTimeValueFR(ps.updatedAt || ps.createdAt || ''))}</td>
          <td>PS ${esc(ps.number || '')}</td>
          <td>${esc(getEventTitle(ps.eventId))}</td>
          <td>${badge(ps.status)}</td>
          <td><div class="list-actions">
            <button class="fr-btn secondary small ps-toggle-btn" type="button" onclick="selectPS('${ps.id}')">${state.selectedPSId === ps.id ? 'Fermer' : 'Ouvrir'}</button>
            <button class="fr-btn secondary small" type="button" onclick="duplicatePS('${ps.id}')">Dupliquer</button>
          </div></td>
        </tr>`).join('')
      }</tbody></table>`
    : (window.SICODUI?.setEmptyState?.('Aucun point de situation. CrÃ©er un premier point de situation.', 'Ajouter un point de situation', 'openPSForm()') || '<p class="help">Aucun point de situation.</p>');
  renderPSPreview();
}

function renderPSPreview() {
  const psPreview = document.getElementById('psPreview');
  if (!psPreview) return;
  const ps = state.selectedPSId ? byId(state.ps, state.selectedPSId) : null;
  if (!ps) {
    psPreview.innerHTML = '<p class="help">SÃ©lectionnez un point de situation.</p>';
  } else {
    mountStoredHtmlTemplatePreview(
      psPreview,
      ps.format === 'focus' ? 'point_situation_focus' : 'point_situation_detail',
      buildPSHtmlTokens(ps),
      {
        title: `Point de situation ${ps.number || ''}`.trim(),
        orientation: ps.format === 'focus' ? 'landscape' : 'portrait',
        className: `is-ps${ps.format === 'focus' ? ' is-focus' : ''}`
      }
    );
  }
  persist();
}

function handlePSImageFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const imgEl = document.getElementById('psImage');
    if (imgEl) imgEl.value = r.result;
    updatePSImageThumb(r.result);
  };
  r.readAsDataURL(file);
}

function updatePSImageThumb(src) {
  const thumb = document.getElementById('psImageThumb');
  if (!thumb) return;
  if (src) { thumb.src = src; thumb.style.display = 'block'; }
  else { thumb.removeAttribute('src'); thumb.style.display = 'none'; }
}

function handlePSAudioFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const audioPrev = document.getElementById('psAudioPreview');
    const audioMeta = document.getElementById('psAudioMeta');
    if (audioPrev) { audioPrev.src = r.result; audioPrev.style.display = 'block'; }
    if (audioMeta) audioMeta.textContent = file.name;
  };
  r.readAsDataURL(file);
}

async function togglePSRecording() {
  if (psMediaRecorder && psMediaRecorder.state === 'recording') {
    stopPSRecording();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Enregistrement audio indisponible sur ce navigateur.', 'error');
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  psChunks = [];
  psMediaRecorder = new MediaRecorder(stream);
  psMediaRecorder.ondataavailable = e => { if (e.data.size) psChunks.push(e.data); };
  psMediaRecorder.onstop = () => {
    const blob = new Blob(psChunks, { type: 'audio/webm' });
    const r = new FileReader();
    r.onload = () => {
      const audioPrev = document.getElementById('psAudioPreview');
      const audioMeta = document.getElementById('psAudioMeta');
      if (audioPrev) { audioPrev.src = r.result; audioPrev.style.display = 'block'; }
      if (audioMeta) audioMeta.textContent = 'Enregistrement direct';
    };
    r.readAsDataURL(blob);
    stream.getTracks().forEach(t => t.stop());
    const recStatus = document.getElementById('psRecordStatus');
    const recBtn = document.getElementById('psRecordBtn');
    const stopBtn = document.getElementById('psStopBtn');
    if (recStatus) recStatus.textContent = 'Enregistrement terminÃ©';
    if (recBtn) recBtn.textContent = 'Enregistrer en direct';
    if (stopBtn) stopBtn.style.display = 'none';
  };
  psMediaRecorder.start();
  const recStatus = document.getElementById('psRecordStatus');
  const recBtn = document.getElementById('psRecordBtn');
  const stopBtn = document.getElementById('psStopBtn');
  if (recStatus) recStatus.textContent = 'Enregistrement en coursâ€¦';
  if (recBtn) recBtn.textContent = 'Enregistrement en cours';
  if (stopBtn) stopBtn.style.display = 'inline-flex';
}

function stopPSRecording() {
  if (psMediaRecorder && psMediaRecorder.state === 'recording') psMediaRecorder.stop();
}

function bindPSMediaInputs() {
  const psImageFile = document.getElementById('psImageFile');
  const psAudioFile = document.getElementById('psAudioFile');
  const psImageEl = document.getElementById('psImage');
  const toolLogoFile = document.getElementById('toolLogoFile');
  const toolLogoEl = document.getElementById('toolLogo');
  if (psImageFile) psImageFile.onchange = () => handlePSImageFile(psImageFile.files[0]);
  if (psAudioFile) psAudioFile.onchange = () => handlePSAudioFile(psAudioFile.files[0]);
  if (psImageEl) psImageEl.oninput = () => updatePSImageThumb(psImageEl.value.trim());
  if (toolLogoFile) toolLogoFile.onchange = () => handleToolLogoFile(toolLogoFile.files[0]);
  if (toolLogoEl) toolLogoEl.oninput = () => updateToolThumb(toolLogoEl.value.trim());
}

// Export PS PDF

function exportPSFocusPDF(ps) {
  if (!ps || !window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 10;
  const palette = getPdfAppearance();
  const blue = palette.primary, light = palette.accent, textColor = palette.text, border=[221,221,221];
  const event = byId(state.events, ps.eventId);
  const means = ps.means ?? ps.moyens ?? '';
  const measures = ps.measures ?? ps.mesures ?? '';
  const attention = ps.attention ?? ps.points ?? '';
  const signature = shouldApplyPdfSignature('ps') ? getPSSignatureConfig() : { mode: 'prefet', name: '', role: '' };
  const title = `POINT DE SITUATION NÂ° ${ps.number}`;
  const contentTop = 46;
  const contentBottomReserve = signature.name ? 22 : 8;
  const gridTop = contentTop;
  const gridBottom = pageH - m - contentBottomReserve;
  const gridH = Math.max(110, gridBottom - gridTop);
  const gridW = pageW - m * 2;
  const col1W = gridW * 1.05 / 4.5;
  const col2W = gridW * 2.35 / 4.5;
  const col3W = gridW - col1W - col2W;
  const box1TopH = gridH * (1 / 2.25);
  const box1BottomH = gridH - box1TopH;
  const centerTopH = gridH * (1 / 3);
  const centerMidH = gridH * (1.15 / 3);
  const centerBottomH = gridH - centerTopH - centerMidH;
  const box3TopH = gridH * (1 / 2.25);
  const box3BottomH = gridH - box3TopH;

  const wrap = (txt, w) => doc.splitTextToSize(String(txt || 'â€”'), w);

  const drawImageContain = (src, x, yPos, w, h, emptyLabel='') => {
    doc.setDrawColor(...border);
    doc.rect(x, yPos, w, h);
    if (!src) {
      if (emptyLabel) {
        doc.setTextColor(120,120,120);
        doc.setFont('helvetica','normal');
        doc.setFontSize(9);
        doc.text(emptyLabel, x + w/2, yPos + h/2, {align:'center'});
        doc.setTextColor(...textColor);
      }
      return;
    }
    try {
      const props = doc.getImageProperties(src);
      const iw = props.width || w, ih = props.height || h;
      const ratio = Math.min((w - 4) / iw, (h - 4) / ih);
      const rw = iw * ratio, rh = ih * ratio;
      const rx = x + (w - rw) / 2, ry = yPos + (h - rh) / 2;
      const fmt = (props.fileType || 'PNG').toUpperCase();
      doc.addImage(src, fmt, rx, ry, rw, rh, undefined, 'FAST');
    } catch (e) {
      try { doc.addImage(src, 'PNG', x + 2, yPos + 2, w - 4, h - 4, undefined, 'FAST'); } catch(_) {}
    }
  };

  const drawLogo = () => addLogoPreserved(doc, m, m, 22, 16);

  const drawHeader = () => {
    drawLogo();
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.setFontSize(15);
    doc.text(title, pageW / 2, m + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.text(ps.title || getEventTitle(ps.eventId) || '', pageW / 2, m + 13, { align: 'center' });

    const headers = ['Date / heure', 'Statut', 'Classification', 'Auteur', 'ID Synergi'];
    const values = [new Date(ps.updatedAt).toLocaleString('fr-FR', {dateStyle:'short',timeStyle:'short'}), ps.status, ps.classification, ps.author, event?.synergi || ''];
    const widths = [54,38,52,70,pageW-m*2-54-38-52-70];
    let x = m;
    const y = m + 18;
    headers.forEach((h, i) => {
      doc.setFillColor(...light); doc.setDrawColor(...border); doc.rect(x, y, widths[i], 7, 'FD');
      doc.setTextColor(...blue); doc.setFont('helvetica','bold'); doc.setFontSize(8);
      doc.text(h, x + widths[i] / 2, y + 4.6, { align: 'center' });
      x += widths[i];
    });
    x = m;
    values.forEach((v, i) => {
      doc.setDrawColor(...border); doc.rect(x, y + 7, widths[i], 8);
      doc.setTextColor(...textColor); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      doc.text(String(v || 'â€”'), x + widths[i] / 2, y + 12.2, { align: 'center', maxWidth: widths[i] - 2 });
      x += widths[i];
    });
  };

  const drawTextBox = (x, y, w, h, label, body, options = {}) => {
    const labelH = 7;
    doc.setDrawColor(...border);
    doc.rect(x, y, w, h);
    doc.setFillColor(...blue);
    doc.rect(x, y, w, labelH, 'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, x + w / 2, y + 4.6, { align: 'center' });

    const innerX = x + 2.5;
    const innerY = y + labelH + 4;
    const innerW = w - 5;
    const innerH = h - labelH - 5;
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(options.fontSize || 8.7);

    if (options.image) {
      drawImageContain(body, x + 1.5, y + labelH + 1.5, w - 3, h - labelH - 3, 'Aucun visuel joint');
      return;
    }

    const lines = wrap(body || '', innerW);
    const lineHeight = options.lineHeight || 4.1;
    const maxLines = Math.max(1, Math.floor(innerH / lineHeight));
    const clipped = lines.slice(0, maxLines);
    doc.text(clipped, innerX, innerY, { maxWidth: innerW });
  };

  const drawBilanBox = (x, y, w, h) => {
    const labelH = 7;
    doc.setDrawColor(...border);
    doc.rect(x, y, w, h);
    doc.setFillColor(...blue);
    doc.rect(x, y, w, labelH, 'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Bilan', x + w / 2, y + 4.6, { align: 'center' });

    const tableX = x + 2.5;
    const tableY = y + labelH + 3;
    const tableW = w - 5;
    const colW = tableW / 4;
    const headers = ['DCD', 'UA', 'UR', 'IMP'];
    const vals = [ps.bilan?.dcd || '0', ps.bilan?.ua || '0', ps.bilan?.ur || '0', ps.bilan?.impliques || '0'];
    let cx = tableX;
    headers.forEach((header, i) => {
      doc.setFillColor(...light); doc.setDrawColor(...border); doc.rect(cx, tableY, colW, 6.5, 'FD');
      doc.setTextColor(...blue); doc.setFont('helvetica','bold'); doc.setFontSize(7.8);
      doc.text(header, cx + colW / 2, tableY + 4.2, { align: 'center' });
      doc.setDrawColor(...border); doc.rect(cx, tableY + 6.5, colW, 7);
      doc.setTextColor(...textColor); doc.setFont('helvetica','normal'); doc.setFontSize(8.4);
      doc.text(String(vals[i]), cx + colW / 2, tableY + 11, { align: 'center' });
      cx += colW;
    });

    const notesY = tableY + 15.5;
    const notesH = Math.max(10, h - labelH - 19);
    if (notesH > 8) {
      doc.setDrawColor(...border);
      doc.rect(tableX, notesY, tableW, notesH);
      const notes = wrap(ps.bilan?.notes || '', tableW - 4).slice(0, Math.floor((notesH - 3) / 4));
      if (notes.length) {
        doc.setTextColor(...textColor);
        doc.setFont('helvetica','normal');
        doc.setFontSize(8.2);
        doc.text(notes, tableX + 2, notesY + 4);
      }
    }
  };

  const drawSignature = () => {
    if (!signature.name && !signature.role) return;
    const lines = signature.mode === 'delegation'
      ? ['Pour le prÃ©fet, par dÃ©lÃ©gation', signature.role || '', signature.name || ''].filter(Boolean)
      : ['Le prÃ©fet', signature.name || ''].filter(Boolean);
    const x = pageW - m - 68;
    const y = pageH - m - (lines.length * 4.5 + 2);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    lines.forEach((line, idx) => doc.text(line, x, y + idx * 4.8));
  };

  const applyFixedSignature = () => {
    drawFixedBottomRightSignature(doc, signature, {
      margin: m,
      blockWidth: 54,
      lineGap: 4.8,
      spacerGap: 4.5,
      fontSize: 10,
      textColor
    });
  };

  drawHeader();
  drawBilanBox(m, gridTop, col1W, box1TopH);
  drawTextBox(m, gridTop + box1TopH, col1W, box1BottomH, 'Moyens', means);
  drawTextBox(m + col1W, gridTop, col2W, centerTopH, 'Situation gÃ©nÃ©rale', ps.situation || '');
  drawTextBox(m + col1W, gridTop + centerTopH, col2W, centerMidH, 'Cartographie', ps.image || '', { image: true });
  drawTextBox(m + col1W, gridTop + centerTopH + centerMidH, col2W, centerBottomH, 'Mesures prises', measures);
  drawTextBox(m + col1W + col2W, gridTop, col3W, box3TopH, "Points d'attention", attention);
  drawTextBox(m + col1W + col2W, gridTop + box3TopH, col3W, box3BottomH, 'Communication', [ps.communication || '', ps.transcript ? `Transcription : ${ps.transcript}` : '', ps.audioData ? 'Source audio jointe.' : ''].filter(Boolean).join('\n\n'));
  applyFixedSignature();
  doc.save(`PS_${ps.number || 'SICOD'}.pdf`);
}


// openPrintWindow : alias vers exportPSPDF
function openPrintWindow() { exportPSPDF(); }

function exportPSPDF() {
  const ps = state.selectedPSId ? byId(state.ps, state.selectedPSId) : null;
  if (!ps) {
    showToast('SÃ©lectionnez un point de situation.', 'error');
    return;
  }
  const templateKey = ps.format === 'focus' ? 'point_situation_focus' : 'point_situation_detail';
  return openHtmlTemplatePdf(
    templateKey,
    buildPSHtmlTokens(ps),
    `PS_${ps.number || 'SICOD'}`,
    { orientation: ps.format === 'focus' ? 'landscape' : 'portrait' }
  );
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 9. MODULE MESSAGES DE COMMANDEMENT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getCommandTypesList() {
  const lines = getDynamicList('commandTypes');
  return lines.map(line => {
    const parts = String(line || '').split('|');
    return [(parts[0] || '').trim(), (parts.slice(1).join('|') || '').trim()];
  }).filter(([label]) => label);
}

function ensureCommandState() {
  if (!Array.isArray(state.commandMessages)) state.commandMessages = [];
  if (!Array.isArray(state.services) || !state.services.length) state.services = JSON.parse(JSON.stringify(defaultServices));
  commandTypes = getCommandTypesList();
}

function getCommandSignatureConfig() {
  return {
    mode: state.settings.commandSignatureMode || 'delegation',
    name: state.settings.commandSignatureName || 'Nicolas HAUPTMANN',
    role: state.settings.commandSignatureRole || 'le directeur de cabinet'
  };
}

function initCommandForm() {
  ensureCommandState();
  const cmdType = document.getElementById('cmdType');
  if (cmdType) cmdType.innerHTML = commandTypes.map(([label], i) => `<option value="${i}">${esc(label)}</option>`).join('');
  renderCommandList();
  if (state.selectedCommandId && byId(getActiveItems(state.commandMessages), state.selectedCommandId)) {
    renderCommandPreview(byId(state.commandMessages, state.selectedCommandId));
  } else if (getActiveItems(state.commandMessages).length) {
    state.selectedCommandId = getActiveItems(state.commandMessages)[0].id;
    renderCommandPreview(getActiveItems(state.commandMessages)[0]);
  } else {
    renderCommandPreview(null);
  }
}


function getOpenEvents(){
  return getActiveItems(state.events).filter(e => e.status !== 'ArchivÃ©');
}
function populateCommandEventSelect(selectedEventId){
  const el = document.getElementById('cmdEvent');
  if(!el) return;
  const options = [['', 'SÃ©lectionner un Ã©vÃ©nement']].concat(
    getOpenEvents().map(e => [e.id, e.title])
  );
  el.innerHTML = options.map(([value,label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('');
  el.value = selectedEventId || '';
}
function syncCommandEventContext(){
  const select = document.getElementById('cmdEvent');
  const site = document.getElementById('cmdSite');
  const selected = byId(state.events, select?.value || '');
  if(selected && site && !site.value){
    site.value = selected.location || '';
  }
}
function injectCommandIntoEventLog(cmd){
  if(!cmd || !cmd.eventId || cmd.status !== 'DiffusÃ©') return;
  const e = byId(state.events, cmd.eventId);
  if(!e || e.status === 'ArchivÃ©') return;
  e.logEntries = Array.isArray(e.logEntries) ? e.logEntries : [];
  const existing = e.logEntries.find(item => item.commandMessageId === cmd.id);
  const payload = {
    id: existing?.id || uid('log'),
    commandMessageId: cmd.id,
    createdAt: cmd.updatedAt || cmd.createdAt || new Date().toISOString(),
    author: 'SIRACEDPC',
    title: `${cmd.typeLabel || 'Message de commandement'}${cmd.number ? ' nÂ° ' + cmd.number : ''}`,
    detail: `Message de commandement ${cmd.status.toLowerCase()}`
  };
  if(existing) Object.assign(existing, payload);
  else e.logEntries.unshift(payload);
  e.updatedAt = new Date().toISOString();
}

function getDefaultCommandMessage() {
  return {
    id: uid('cmdmsg'),
    number: (state.commandMessages?.length || 0) + 1,
    status: 'Brouillon',
    eventId: '',
    typeIndex: 0,
    typeLabel: commandTypes[0]?.[0] || '',
    autoText: commandTypes[0]?.[1] || '',
    date: todayISO(),
    time: timeHHMM(),
    event: '',
    site: '',
    reference: '',
    activation: '',
    pcoLocation: '',
    plan: '',
    sirenLabel: '',
    suivi: false,
    cod: false,
    pco: false,
    planActive: false,
    limited: false,
    siren: false,
    exercise: false,
    originalSigned: false,
    services: JSON.parse(JSON.stringify(defaultServices))
  };
}

function openCommandForm(id) {
  ensureCommandState();
  const existing = id ? byId(state.commandMessages, id) : null;
  const draft = !existing ? window.SICODCommand?.loadDraft?.() : null;
  const d = existing ? JSON.parse(JSON.stringify(existing)) : Object.assign(getDefaultCommandMessage(), draft || {});
  document.getElementById('commandId').value = d.id || '';
  document.getElementById('cmdType').innerHTML = commandTypes.map(([label], i) => `<option value="${i}">${esc(label)}</option>`).join('');
  populateCommandEventSelect(d.eventId || '');
  document.getElementById('cmdDate').value = d.date || todayISO();
  document.getElementById('cmdTime').value = d.time || timeHHMM();
  document.getElementById('cmdType').value = String(d.typeIndex || 0);
  document.getElementById('cmdEvent').value = d.eventId || '';
  document.getElementById('cmdStatus').value = normalizePublishStatus(d.status, 'Brouillon');
  document.getElementById('cmdNumber').value = d.number || '';
  document.getElementById('cmdSite').value = d.site || '';
  document.getElementById('cmdRef').value = d.reference || '';
  document.getElementById('cmdActivation').value = d.activation || '';
  document.getElementById('cmdPcoLocation').value = d.pcoLocation || '';
  document.getElementById('cmdPlan').value = d.plan || '';
  document.getElementById('cmdSirenLabel').value = d.sirenLabel || '';
  document.getElementById('cmdSuivi').checked = !!d.suivi;
  document.getElementById('cmdCOD').checked = !!d.cod;
  document.getElementById('cmdPCO').checked = !!d.pco;
  document.getElementById('cmdPlanActive').checked = !!d.planActive;
  document.getElementById('cmdLimited').checked = !!d.limited;
  document.getElementById('cmdSiren').checked = !!d.siren;
  document.getElementById('cmdExercise').checked = !!d.exercise;
  document.getElementById('cmdOriginalSigned').checked = !!d.originalSigned;
  state.services = JSON.parse(JSON.stringify(d.services && d.services.length ? d.services : defaultServices));
  renderServiceRows();
  renderCommandPreview(getCommandData());
  document.getElementById('commandDialog').showModal();
  ['cmdDate','cmdTime','cmdType','cmdEvent','cmdStatus','cmdSite','cmdRef','cmdActivation','cmdPcoLocation','cmdPlan','cmdSirenLabel','cmdSuivi','cmdCOD','cmdPCO','cmdPlanActive','cmdLimited','cmdSiren','cmdExercise','cmdOriginalSigned']
    .forEach((fieldId) => {
      const el = document.getElementById(fieldId);
      if (!el) return;
      const persistDraft = () => window.SICODCommand?.saveDraft?.(getCommandData());
      if (el.type === 'checkbox' || el.tagName === 'SELECT') el.onchange = persistDraft;
      else el.oninput = persistDraft;
    });
}

function saveCommandMessage() {
  ensureCommandState();
  const d = getCommandData();
  const id = document.getElementById('commandId').value || uid('cmdmsg');
  const existing = byId(state.commandMessages, id);
  const typeSnapshot = getReferenceSnapshot('commandTypes', d.typeLabel || '');
  const template = window.SICODPdfTemplates?.getTemplate(state, 'command_message', 'default');
  const activeCommandMessages = getActiveItems(state.commandMessages);
  const payload = Object.assign({}, d, {
    id,
    typeId: typeSnapshot.id,
    typeLabel: typeSnapshot.label || d.typeLabel || '',
    typeLabelSnapshot: typeSnapshot.label || d.typeLabel || '',
    templateId: template?.id || existing?.templateId || '',
    templateVersion: template?.version || existing?.templateVersion || 1,
    number: existing?.number || ((activeCommandMessages[0]?.number || 0) + 1),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const validation = window.SICODCommand?.validate?.(payload);
  if (validation && validation.ok === false) {
    showToast(validation.message, 'error');
    return;
  }
  if (existing) Object.assign(existing, payload);
  else state.commandMessages.unshift(payload);
  state.selectedCommandId = id;
  injectCommandIntoEventLog(existing || payload);
  window.SICODCommand?.clearDraft?.();
  persist();
  document.getElementById('commandDialog').close();
  renderAll();
  renderCommandPreview(byId(state.commandMessages, id));
}

async function deleteSelectedCommand() {
  if (!state.selectedCommandId) { showToast('SÃ©lectionnez un message de commandement', 'error'); return; }
  const record = byId(state.commandMessages, state.selectedCommandId);
  if (!record) return;
  if (!await confirmAsync('Supprimer ce message de commandement ?')) return;
  window.SICODDataModel?.archiveRecord(state.commandMessages, state.selectedCommandId);
  state.selectedCommandId = getActiveItems(state.commandMessages)[0]?.id || null;
  persist();
  renderCommandList();
  renderCommandPreview(state.selectedCommandId ? byId(state.commandMessages, state.selectedCommandId) : null);
}

function toggleCommandPreview(id) {
  if (state.selectedCommandId === id) {
    state.selectedCommandId = '';
    persist();
    renderCommandList();
    renderCommandPreview(null);
    return;
  }
  state.selectedCommandId = id;
  persist();
  renderCommandList();
  renderCommandPreview(byId(state.commandMessages, id));
}

function selectCommand(id) {
  state.selectedCommandId = id;
  persist();
  renderCommandList();
  renderCommandPreview(byId(state.commandMessages, id));
}

function filterCommandByEvent(eventId) {
  state.selectedCommandEventFilter = eventId || null;
  renderCommandList();
}

function renderCommandList() {
  const el = document.getElementById('commandList');
  if (!el) return;

  // Populate event filter dropdown
  const cmdEventFilter = document.getElementById('cmdEventFilter');
  if (cmdEventFilter) {
    const events = getActiveItems(state.events);
    const cur = state.selectedCommandEventFilter || '';
    cmdEventFilter.innerHTML = '<option value="">Tous les Ã©vÃ©nements</option>' +
      events.map(e => `<option value="${esc(e.id)}" ${cur === e.id ? 'selected' : ''}>${esc(e.title)}</option>`).join('');
  }

  const q = (document.getElementById('commandListSearch')?.value || '').toLowerCase().trim();
  const eventFilter = state.selectedCommandEventFilter || null;
  let items = [...getActiveItems(state.commandMessages).filter(isLinkedToActiveEvent)]
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  if (state.selectedCommandId && !items.some((item) => item.id === state.selectedCommandId)) {
    state.selectedCommandId = null;
  }
  if (eventFilter) items = items.filter(i => i.eventId === eventFilter);
  if (q) items = items.filter(i => [i.number, i.typeLabel, i.status, i.event, getEventTitle(i.eventId)].join(' ').toLowerCase().includes(q));

  if (!items.length) {
    el.innerHTML = window.SICODUI?.setEmptyState?.('Aucun message de commandement. CrÃ©er un premier message.', 'Nouveau message', 'openCommandForm()') || '<p class="help">Aucun message de commandement enregistrÃ©.</p>';
    return;
  }
  el.innerHTML = `<table class="table"><thead><tr><th>Horodatage</th><th>NumÃ©ro</th><th>Ã‰vÃ¨nement</th><th>Statut</th><th>Action</th></tr></thead><tbody>${
    items.map(item => `<tr class="${item.id === state.selectedCommandId ? 'is-selected' : ''}">
      <td>${esc(formatDateTimeValueFR(item.updatedAt || item.createdAt || ''))}</td>
      <td><div class="event-title-block"><span class="event-label">Message ${esc(item.number || '')}</span><span class="table-meta">${esc(item.typeLabel || '')}</span></div></td>
      <td>${esc(item.event || getEventTitle(item.eventId) || 'Ã‰vÃ¨nement supprimÃ©')}</td>
      <td>${badge(item.status)}</td>
      <td><div class="list-actions">
        <button class="fr-btn secondary small" type="button" onclick="toggleCommandPreview('${item.id}')">${item.id === state.selectedCommandId ? 'Fermer' : 'Ouvrir'}</button>
        <button class="fr-btn secondary small" type="button" onclick="duplicateCommand('${item.id}')">Dupliquer</button>
      </div></td>
    </tr>`).join('')
  }</tbody></table>`;
}

function duplicateCommand(id) {
  const src = byId(state.commandMessages, id);
  if (!src) return;
  const siblings = getActiveItems(state.commandMessages).filter(m => m.eventId === src.eventId);
  const copy = Object.assign({}, src, {
    id: uid('cmd'),
    number: String(siblings.length + 1),
    status: 'Brouillon',
    updatedAt: new Date().toISOString()
  });
  state.commandMessages.unshift(copy);
  state.selectedCommandId = copy.id;
  persist();
  renderCommandList();
  renderCommandPreview(copy);
  showToast('Message de commandement dupliquÃ©.');
}

function addServiceRow(data) {
  state.services.push(data || { name: '', cod: false, pco: false });
  renderServiceRows();
  renderCommandPreview(getCommandData());
}

function removeServiceRow(i) {
  state.services.splice(i, 1);
  renderServiceRows();
  renderCommandPreview(getCommandData());
}

function renderServiceRows() {
  const svcRows = document.getElementById('svcRows');
  if (!svcRows) return;
  svcRows.innerHTML = state.services.map((svc, i) => `<div class="svc-row">
    <input value="${esc(svc.name)}" placeholder="Service / entitÃ©" oninput="state.services[${i}].name=this.value;renderCommandPreview(getCommandData())">
    <label class="check"><input type="checkbox" ${svc.cod ? 'checked' : ''} onchange="state.services[${i}].cod=this.checked;renderCommandPreview(getCommandData())"> COD</label>
    <label class="check"><input type="checkbox" ${svc.pco ? 'checked' : ''} onchange="state.services[${i}].pco=this.checked;renderCommandPreview(getCommandData())"> PCO</label>
    <button class="fr-btn danger small" type="button" onclick="removeServiceRow(${i})">Retirer</button>
  </div>`).join('');
}

function getCommandData() {
  ensureCommandState();
  const idx = +(document.getElementById('cmdType')?.value || 0);
  const [typeLabel, autoText] = commandTypes[idx] || ['', ''];
  const eventId = document.getElementById('cmdEvent')?.value || '';
  const eventObj = byId(state.events, eventId);
  return {
    typeIndex: idx,
    typeLabel, autoText,
    date: document.getElementById('cmdDate')?.value || '',
    time: document.getElementById('cmdTime')?.value || '',
    eventId,
    event: eventObj?.title || '',
    status: normalizePublishStatus(document.getElementById('cmdStatus')?.value, 'Brouillon'),
    site: document.getElementById('cmdSite')?.value || '',
    reference: document.getElementById('cmdRef')?.value || '',
    activation: document.getElementById('cmdActivation')?.value || '',
    pcoLocation: document.getElementById('cmdPcoLocation')?.value || '',
    plan: document.getElementById('cmdPlan')?.value || '',
    sirenLabel: document.getElementById('cmdSirenLabel')?.value || '',
    suivi: document.getElementById('cmdSuivi')?.checked || false,
    cod: document.getElementById('cmdCOD')?.checked || false,
    pco: document.getElementById('cmdPCO')?.checked || false,
    planActive: document.getElementById('cmdPlanActive')?.checked || false,
    limited: document.getElementById('cmdLimited')?.checked || false,
    siren: document.getElementById('cmdSiren')?.checked || false,
    exercise: document.getElementById('cmdExercise')?.checked || false,
    originalSigned: document.getElementById('cmdOriginalSigned')?.checked || false,
    services: (state.services || []).filter(s => String(s.name || '').trim())
  };
}

function renderCommandPreview(data) {
  const commandPreview = document.getElementById('commandPreview');
  if (!commandPreview) return;
  const d = data || (state.selectedCommandId ? byId(state.commandMessages, state.selectedCommandId) : null);
  if (!d) {
    commandPreview.innerHTML = '<p class="help">SÃ©lectionnez un message de commandement.</p>';
    return;
  }
  mountStoredHtmlTemplatePreview(commandPreview, 'command_message', buildCommandHtmlTokens(d), {
    title: `Message de commandement ${d.number || ''}`.trim(),
    orientation: 'portrait',
    className: 'is-command'
  });
}

function exportCommandPDF() {
  const d = state.selectedCommandId ? byId(state.commandMessages, state.selectedCommandId) : null;
  if (!d) {
    showToast('SÃ©lectionnez un message de commandement.', 'error');
    return;
  }
  return openHtmlTemplatePdf(
    'command_message',
    buildCommandHtmlTokens(d),
    `message-commandement-${slugify(d.event || d.typeLabel || 'document')}`,
    { orientation: 'portrait' }
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 10. MODULE FICHES RÃ‰FLEXES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getReflexFiches() {
  if (!Array.isArray(state.reflexFiches) || !state.reflexFiches.length) {
    state.reflexFiches = JSON.parse(JSON.stringify(reflexLibrary.fiches || []));
  }
  return getActiveItems(state.reflexFiches);
}

function getReflexGlossary() {
  if (!Array.isArray(state.reflexGlossary) || !state.reflexGlossary.length) {
    state.reflexGlossary = JSON.parse(JSON.stringify(reflexLibrary.glossary || []));
  }
  return state.reflexGlossary;
}

function parseFicheSections(raw) {
  const text = String(raw || '').replace(/\r/g, '').trim();
  if (!text) return [];
  const lines = text.split('\n');
  const sections = [];
  let current = null;
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const headingMatch = trimmed.match(/^\[(.+?)\]$/);
    if (headingMatch) {
      current = { heading: headingMatch[1].trim(), items: [] };
      sections.push(current);
      return;
    }
    if (!current) {
      current = { heading: 'Contenu', items: [] };
      sections.push(current);
    }
    current.items.push(trimmed.replace(/^[-â€¢]\s*/, ''));
  });
  return sections.filter(sec => sec.heading && sec.items.length);
}

function formatFicheSections(sections) {
  return (sections || []).map(sec => `[${sec.heading}]\n${(sec.items || []).map(item => `- ${item}`).join('\n')}`).join('\n\n');
}

function openFicheForm(code) {
  const fiches = getReflexFiches();
  const fiche = code ? fiches.find(f => f.code === code) : null;
  const draft = !fiche ? (() => { try { return JSON.parse(sessionStorage.getItem('sicodDraftFicheV1') || 'null'); } catch { return null; } })() : null;
  const familySelect = document.getElementById('ficheFamily');
  const familyOptions = Array.from(new Set([...getDynamicList('reflexFamilies'), ...fiches.map(f => f.family).filter(Boolean), fiche?.family || ''])).filter(Boolean);
  setSelectOptions(familySelect, familyOptions, fiche?.family || draft?.family || familyOptions[0] || 'Autres');
  document.getElementById('ficheId').value = fiche?.code || '';
  document.getElementById('ficheCode').value = fiche?.code || draft?.code || '';
  document.getElementById('ficheTitle').value = fiche?.title || draft?.title || '';
  document.getElementById('ficheSections').value = formatFicheSections(fiche?.sections || draft?.sections || []);
  ['ficheFamily','ficheCode','ficheTitle','ficheSections'].forEach((idField) => {
    const el = document.getElementById(idField);
    if (!el) return;
    const saveDraft = () => {
      try {
        sessionStorage.setItem('sicodDraftFicheV1', JSON.stringify({
          family: document.getElementById('ficheFamily')?.value || '',
          code: document.getElementById('ficheCode')?.value || '',
          title: document.getElementById('ficheTitle')?.value || '',
          sections: parseFicheSections(document.getElementById('ficheSections')?.value || '')
        }));
      } catch {}
    };
    if (el.tagName === 'SELECT') el.onchange = saveDraft;
    else el.oninput = saveDraft;
  });
  ficheDialog.showModal();
}

function saveFiche() {
  const fiches = getReflexFiches();
  const originalCode = document.getElementById('ficheId').value.trim();
  const code = document.getElementById('ficheCode').value.trim();
  const title = document.getElementById('ficheTitle').value.trim();
  const familySnapshot = getReferenceSnapshot('reflexFamilies', document.getElementById('ficheFamily').value.trim() || getDynamicList('reflexFamilies')[0] || 'Autres');
  const sections = parseFicheSections(document.getElementById('ficheSections').value);
  if (!code || !title) { showToast('Renseignez au minimum le code et le titre.', 'error'); return; }
  if (!sections.length) { showToast('Ajoutez au moins une section avec du contenu.', 'error'); return; }
  const duplicate = fiches.find(f => f.code === code && f.code !== originalCode);
  if (duplicate) { showToast('Une fiche avec ce code existe dÃ©jÃ .', 'error'); return; }
  const payload = { code, title, family: familySnapshot.label, familyId: familySnapshot.id, familyLabelSnapshot: familySnapshot.label, sections };
  const index = fiches.findIndex(f => f.code === originalCode);
  if (index >= 0) fiches[index] = payload;
  else fiches.push(payload);
  fiches.sort((a, b) => `${a.family} ${a.code}`.localeCompare(`${b.family} ${b.code}`, 'fr'));
  state.reflexFiches = fiches;
  state.selectedFiche = code;
  try { sessionStorage.removeItem('sicodDraftFicheV1'); } catch {}
  persist();
  ficheDialog.close();
  renderFiches();
}

async function deleteSelectedFiche() {
  if (!state.selectedFiche || state.selectedFiche === 'glossary') return;
  const fiches = getReflexFiches();
  const fiche = fiches.find(f => f.code === state.selectedFiche);
  if (!fiche) return;
  if (!await confirmAsync(`Supprimer la fiche ${fiche.code} Â· ${fiche.title} ?`)) return;
  fiche.deletedAt = new Date().toISOString();
  fiche.updatedAt = new Date().toISOString();
  state.selectedFiche = (getReflexFiches()[0] || {}).code || 'glossary';
  persist();
  renderFiches();
}

function renderFiches() {
  const ficheNav = document.getElementById('ficheNav');
  const ficheContent = document.getElementById('ficheContent');
  if (!ficheNav || !ficheContent) return;

  const allFiches = getReflexFiches();
  const q = (document.getElementById('ficheSearch')?.value || '').toLowerCase().trim();
  const fiches = q
    ? allFiches.filter(f => [f.code, f.title, f.family, ...(f.sections || []).flatMap(s => [s.heading, ...(s.items || [])])].join(' ').toLowerCase().includes(q))
    : allFiches;
  const glossary = getReflexGlossary();
  const groups = {};
  fiches.forEach(f => { (groups[f.family] ||= []).push(f); });

  ficheNav.innerHTML = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(([family, items]) =>
    `<div class="group"><h3>${esc(family)}</h3>${
      items.sort((a, b) => `${a.code} ${a.title}`.localeCompare(`${b.code} ${b.title}`, 'fr')).map(f => `<button class="fiche-link ${state.selectedFiche === f.code ? 'active' : ''}" onclick="selectFiche('${esc(f.code)}')">${esc(f.code)} Â· ${esc(f.title)}</button>`).join('')
    }</div>`
  ).join('') + (!q ? `<div class="group"><h3>ComplÃ©ments</h3><button class="fiche-link ${state.selectedFiche === 'glossary' ? 'active' : ''}" onclick="selectFiche('glossary')">Glossaire</button></div>` : '');

  if (state.selectedFiche === 'glossary') {
    ficheContent.innerHTML = `<div class="fiche-toolbar"><button class="fr-btn small" type="button" onclick="openFicheForm()">Ajouter une fiche</button></div><h2>Glossaire</h2><div class="fiche-section"><ul>${glossary.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`;
    return;
  }

  const fiche = fiches.find(f => f.code === state.selectedFiche) || fiches[0];
  if (!fiche) {
    ficheContent.innerHTML = `<div class="fiche-toolbar"><button class="fr-btn small" type="button" onclick="openFicheForm()">Ajouter une fiche</button></div><p class="fiche-empty">Aucune fiche disponible.</p>`;
    return;
  }
  state.selectedFiche = fiche.code;
  ficheContent.innerHTML = `<div class="fiche-toolbar"><button class="fr-btn secondary small" type="button" onclick="openFicheForm('${esc(fiche.code)}')">Modifier</button><button class="fr-btn danger small" type="button" onclick="deleteSelectedFiche()">Supprimer</button></div><h2>${esc(fiche.code)} Â· ${esc(fiche.title)}</h2><div class="fiche-meta"><span><strong>Famille :</strong> ${esc(fiche.family)}</span></div>${
    fiche.sections.map(sec => `<section class="fiche-section"><h3>${esc(sec.heading)}</h3><ul>${(sec.items || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul></section>`).join('')
  }`;
}

function selectFiche(code) {
  state.selectedFiche = code;
  persist();
  renderFiches();
}

function exportAllFichesPDF() {
  const fiches = getReflexFiches();
  if (!fiches.length || !window.jspdf) { showToast('Aucune fiche Ã  exporter.', 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const palette = getPdfAppearance();
  const blue = palette.primary, border = [221,221,221], textColor = palette.text, light = palette.accent;
  const logo = currentLogoSrc();

  const addHeader = (fiche) => {
    let y = margin;
    addLogoPreserved(doc, margin, y, 18, 18);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Fiche rÃ©flexe', margin + 24, y + 7);
    doc.setFontSize(14);
    doc.text(`${fiche.code} Â· ${fiche.title}`, margin, y + 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text(`Famille : ${fiche.family || 'Autres'}`, margin, y + 35);
    return y + 42;
  };

  const ensureSpace = (needed, y, fiche) => {
    if (y + needed <= pageH - margin) return y;
    doc.addPage();
    return addHeader(fiche);
  };

  fiches.forEach((fiche, index) => {
    if (index > 0) doc.addPage();
    let y = addHeader(fiche);
    (fiche.sections || []).forEach(sec => {
      y = ensureSpace(14, y, fiche);
      doc.setFillColor(...light);
      doc.setDrawColor(...border);
      doc.rect(margin, y, pageW - margin * 2, 8, 'FD');
      doc.setTextColor(...blue);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(sec.heading || 'Contenu', margin + 2, y + 5.5);
      y += 11;
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      (sec.items || []).forEach(item => {
        const lines = doc.splitTextToSize(`â€¢ ${String(item || '')}`, pageW - margin * 2 - 4);
        const needed = lines.length * 5 + 1;
        y = ensureSpace(needed, y, fiche);
        doc.text(lines, margin + 2, y);
        y += lines.length * 5;
      });
      y += 3;
    });
  });

  doc.save('fiches-reflexes.pdf');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 11. MODULE ANNUAIRE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function triggerContactImport() {
  const el = document.getElementById('contactImportFile');
  if (el) { el.value = ''; el.click(); }
}


function getDirectoryEntityOptions(extra) {
  return Array.from(new Set([
    ...getDynamicList('directoryEntities'),
    ...getActiveItems(state.contacts).map(c => (c.entity || '').trim()).filter(Boolean),
    ...(extra ? [extra] : [])
  ])).filter(Boolean);
}

function openContactForm(id) {
  const c = id ? byId(state.contacts, id) : null;
  document.getElementById('contactId').value = c?.id || '';
  setSelectOptions(document.getElementById('contactGroup'), getDynamicList('directoryGroups'), c?.group || getDynamicList('directoryGroups')[0]);
  setSelectOptions(document.getElementById('contactEntity'), getDirectoryEntityOptions(c?.entity || ''), c?.entity || getDirectoryEntityOptions()[0] || '');
  document.getElementById('contactFunction').value = c?.function || '';
  document.getElementById('contactName').value = c?.name || '';
  document.getElementById('contactPhone1').value = c?.phone1 || '';
  document.getElementById('contactPhone2').value = c?.phone2 || '';
  document.getElementById('contactEmail1').value = c?.email1 || '';
  document.getElementById('contactEmail2').value = c?.email2 || '';
  document.getElementById('contactDialog').showModal();
}

function saveContact() {
  const id = document.getElementById('contactId').value || uid('ct');
  const existing = byId(state.contacts, id);
  const groupSnapshot = getReferenceSnapshot('directoryGroups', document.getElementById('contactGroup').value);
  const entitySnapshot = getReferenceSnapshot('directoryEntities', document.getElementById('contactEntity').value.trim());
  const data = {
    id,
    group: groupSnapshot.label,
    groupId: groupSnapshot.id,
    groupLabelSnapshot: groupSnapshot.label,
    entity: entitySnapshot.label,
    entityId: entitySnapshot.id,
    entityLabelSnapshot: entitySnapshot.label,
    function: document.getElementById('contactFunction').value.trim(),
    name: document.getElementById('contactName').value.trim(),
    phone1: document.getElementById('contactPhone1').value.trim(),
    phone2: document.getElementById('contactPhone2').value.trim(),
    email1: document.getElementById('contactEmail1').value.trim(),
    email2: document.getElementById('contactEmail2').value.trim()
  };
  if (!data.name) { showToast('Le nom du contact est requis.', 'error'); return; }
  if (existing) Object.assign(existing, data);
  else state.contacts.push(data);
  persist();
  document.getElementById('contactDialog').close();
  renderDirectory();
}

async function deleteContact(id) {
  if (!await confirmAsync('Supprimer ce contact ?')) return;
  window.SICODDataModel?.archiveRecord(state.contacts, id);
  persist();
  renderDirectory();
}

function renderDirectory() {
  const directoryList = document.getElementById('directoryList');
  if (!directoryList) return;
  const q = (document.getElementById('directorySearch')?.value || '').toLowerCase().trim();
  const groups = getDynamicList('directoryGroups');
  const contacts = getActiveItems(state.contacts).filter(c => !q || [c.group, c.entity, c.function, c.name, c.phone1, c.phone2, c.email1, c.email2].join(' ').toLowerCase().includes(q));
  const countEl = document.getElementById('directoryCount');
  if (countEl) countEl.textContent = `${contacts.length} contact(s)`;

  directoryList.innerHTML = groups.map(group => {
    const items = contacts.filter(c => (c.group || '') === group);
    if (!items.length) return '';
    return `<div class="card directory-group">
      <div class="card-header"><h2 class="card-title">${esc(group)}</h2></div>
      <div class="card-body"><table class="table"><thead><tr><th>EntitÃ©</th><th>Fonction</th><th>Nom</th><th>TÃ©lÃ©phone 1</th><th>TÃ©lÃ©phone 2</th><th>e-mail 1</th><th>e-mail 2</th><th>Actions</th></tr></thead><tbody>${
        items.map(c => `<tr>
          <td>${esc(c.entity||'')}</td><td>${esc(c.function||'')}</td><td>${esc(c.name)}</td><td>${esc(c.phone1||'')}</td><td>${esc(c.phone2||'')}</td>
          <td>${esc(c.email1||'')}</td><td>${esc(c.email2||'')}</td>
          <td><div class="list-actions">
            <button class="fr-btn secondary small" type="button" onclick="openContactForm('${c.id}')">Modifier</button>
            <button class="fr-btn danger small" type="button" onclick="deleteContact('${c.id}')">Supprimer</button>
          </div></td>
        </tr>`).join('')
      }</tbody></table></div>
    </div>`;
  }).join('') || '<p class="help">Aucun contact enregistrÃ©.</p>';
}

function exportContactsCSV() {
  const rows = [['Groupe','EntitÃ©','Fonction','Nom','TÃ©lÃ©phone 1','TÃ©lÃ©phone 2','e-mail 1','e-mail 2'],
    ...getActiveItems(state.contacts).map(c => [c.group,c.entity||'',c.function||'',c.name,c.phone1||'',c.phone2||'',c.email1||'',c.email2||''])];
  downloadCSV('annuaire.csv', rows);
}

function importContactsCSV(file) {
  if (!file) return;
  file.text().then(text => {
    const lines = text.replaceAll('\r', '').split('\n').filter(Boolean);
    if (lines.length < 2) { showToast("Le fichier CSV d'annuaire est vide ou invalide.", 'error'); return; }
    const data = lines.slice(1).map(line => line.split(/[;,]/).map(v => v.replace(/^"|"$/g, '')));
    let imported = 0;
    data.forEach(cols => {
      const isNewFormat = cols.length >= 8;
      const nameIndex = isNewFormat ? 3 : 1;
      if (!cols[nameIndex]) return;
      state.contacts.push({
        id: uid('ct'),
        group: cols[0] || getDynamicList('directoryGroups')[0],
        entity: isNewFormat ? (cols[1] || '') : '',
        function: isNewFormat ? (cols[2] || '') : '',
        name: cols[nameIndex] || '',
        phone1: cols[isNewFormat ? 4 : 2] || '',
        phone2: cols[isNewFormat ? 5 : 3] || '',
        email1: cols[isNewFormat ? 6 : 4] || '',
        email2: cols[isNewFormat ? 7 : 5] || ''
      });
      imported += 1;
    });
    if (!imported) { showToast("Aucun contact exploitable n'a Ã©tÃ© trouvÃ© dans ce fichier CSV.", 'error'); return; }
    persist();
    renderDirectory();
    showToast(`Import CSV terminÃ© : ${imported} contact(s) ajoutÃ©(s).`);
  });
}

function exportContactsPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const palette = getPdfAppearance();
  const blue = palette.primary;
  const headerFill = palette.accent;
  const textColor = palette.text;
  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 10;

  const drawHeader = (isFirstPage = false) => {
    addLogoPreserved(doc, margin, 8, 22, 16);
    doc.setTextColor(...blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 16 : 14);
    doc.text('ANNUAIRE ORSEC DEPARTEMENTAL', pageW / 2, 16, { align: 'center' });
    if (isFirstPage) {
      doc.setFontSize(12);
      doc.text('Bouches-du-RhÃ´ne', pageW / 2, 23, { align: 'center' });
    }
    doc.setTextColor(...textColor);
    y = isFirstPage ? 34 : 28;
  };

  const ensureSpace = needed => {
    if (y + needed > pageH - 12) {
      doc.addPage();
      drawHeader(false);
    }
  };

  const drawTableHeader = () => {
    const cols = [44, 34, 44, 34, 34, 76];
    const headers = ['Fonction', 'Nom', 'EntitÃ©', 'TÃ©lÃ©phone 1', 'TÃ©lÃ©phone 2', 'E-mail'];
    let x = margin;
    const totalW = cols.reduce((sum, value) => sum + value, 0);
    doc.setFillColor(...headerFill);
    doc.setDrawColor(221, 221, 221);
    doc.rect(margin, y, totalW, 7, 'FD');
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    headers.forEach((h, i) => {
      doc.rect(x, y, cols[i], 7);
      doc.text(h, x + cols[i] / 2, y + 4.5, { align: 'center' });
      x += cols[i];
    });
    y += 7;
    doc.setTextColor(...textColor);
    return cols;
  };

  drawHeader(true);

  const groups = getDynamicList('directoryGroups');
  const contacts = [...getActiveItems(state.contacts)].sort((a, b) => {
    return [a.group || '', a.entity || '', a.name || ''].join('|').localeCompare([b.group || '', b.entity || '', b.name || ''].join('|'), 'fr');
  });

  groups.forEach(group => {
    const groupItems = contacts.filter(c => (c.group || '') === group);
    if (!groupItems.length) return;

    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...blue);
    doc.text(group.toUpperCase(), margin, y);
    y += 6;

    const entities = [...new Set(groupItems.map(c => (c.entity || '').trim() || 'Sans entitÃ©'))];
    entities.forEach(entity => {
      const entityItems = groupItems.filter(c => (((c.entity || '').trim() || 'Sans entitÃ©') === entity));
      if (!entityItems.length) return;

      ensureSpace(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      doc.text(entity, margin, y);
      y += 4;
      const cols = drawTableHeader();

      entityItems.forEach(c => {
        const values = [
          c.function || '',
          c.name || '',
          c.entity || '',
          c.phone1 || '',
          c.phone2 || '',
          [c.email1 || '', c.email2 || ''].filter(Boolean).join(' / ')
        ];
        const wrapped = values.map((v, i) => doc.splitTextToSize(String(v), cols[i] - 3));
        const lineCount = Math.max(1, ...wrapped.map(lines => lines.length || 1));
        const rowH = Math.max(8, lineCount * 4 + 2);
        ensureSpace(rowH + 1);
        let x = margin;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        wrapped.forEach((lines, i) => {
          doc.rect(x, y, cols[i], rowH);
          doc.text(lines, x + 1.5, y + 4.5, { maxWidth: cols[i] - 3 });
          x += cols[i];
        });
        y += rowH;
      });

      y += 4;
    });
  });

  if (!contacts.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Aucun contact enregistrÃ©.', margin, y);
  }

  doc.save('annuaire.pdf');
}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 12. MODULE OUTILS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function handleToolLogoFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const toolLogo = document.getElementById('toolLogo');
    if (toolLogo) toolLogo.value = r.result;
    updateToolThumb(r.result);
  };
  r.readAsDataURL(file);
}

function updateToolThumb(src) {
  const thumb = document.getElementById('toolLogoThumb');
  if (!thumb) return;
  if (src) { thumb.src = src; thumb.style.display = 'block'; }
  else { thumb.removeAttribute('src'); thumb.style.display = 'none'; }
}

function autoFillToolLogo() {
  const toolLogo = document.getElementById('toolLogo');
  const toolUrl = document.getElementById('toolUrl');
  if (!toolLogo || toolLogo.value.trim()) return;
  const guessed = guessFavicon(toolUrl?.value.trim() || '');
  if (guessed) { toolLogo.value = guessed; updateToolThumb(guessed); }
}

function openToolForm(id) {
  const t = id ? byId(state.tools, id) : null;
  document.getElementById('toolId').value = t?.id || '';
  document.getElementById('toolName').value = t?.name || '';
  document.getElementById('toolUrl').value = t?.url || '';
  document.getElementById('toolDescription').value = t?.description || '';
  document.getElementById('toolUsername').value = t?.username || '';
  document.getElementById('toolPassword').value = t?.password || '';
  const logoVal = t?.logo || '';
  document.getElementById('toolLogo').value = logoVal;
  updateToolThumb(logoVal);
  document.getElementById('toolDialog').showModal();
}

function saveTool() {
  const id = document.getElementById('toolId').value || uid('tool');
  const existing = byId(state.tools, id);
  const urlVal = document.getElementById('toolUrl').value.trim();
  const logo = document.getElementById('toolLogo').value.trim();
  const data = {
    id,
    name: document.getElementById('toolName').value.trim(),
    url: urlVal,
    description: document.getElementById('toolDescription').value.trim(),
    username: document.getElementById('toolUsername').value.trim(),
    password: document.getElementById('toolPassword').value.trim(),
    logo
  };
  if (!data.name || !data.url) { showToast("Le nom et l'URL de l'outil sont requis.", 'error'); return; }
  if (existing) Object.assign(existing, data);
  else state.tools.unshift(data);
  persist();
  document.getElementById('toolDialog').close();
  renderTools();
}

async function deleteTool(id) {
  if (!await confirmAsync('Supprimer cet outil ?')) return;
  window.SICODDataModel?.archiveRecord(state.tools, id);
  persist();
  renderTools();
  const toolInfoDialog = document.getElementById('toolInfoDialog');
  if (toolInfoDialog?.open) toolInfoDialog.close();
}

function showToolInfo(id) {
  const t = byId(state.tools, id);
  if (!t) return;
  const content = document.getElementById('toolInfoContent');
  const editBtn = document.getElementById('toolInfoEditBtn');
  const deleteBtn = document.getElementById('toolInfoDeleteBtn');
  const accessBtn = document.getElementById('toolInfoAccessBtn');
  if (content) content.innerHTML = `\n    <div><strong>Nom</strong><br>${esc(t.name)}</div>
    <div><strong>Description</strong><br>${esc(t.description || 'â€”')}</div>
    <div><strong>Identifiant</strong><br>${esc(t.username || 'â€”')}</div>
    <div><strong>Mot de passe</strong><br>${esc(t.password || 'â€”')}</div>
    <div><strong>URL</strong><br>${esc(t.url || 'â€”')}</div>`;
  if (editBtn) editBtn.onclick = () => { document.getElementById('toolInfoDialog').close(); openToolForm(id); };
  if (deleteBtn) deleteBtn.onclick = () => deleteTool(id);
  if (accessBtn) accessBtn.onclick = () => openToolAccess(id);
  document.getElementById('toolInfoDialog').showModal();
}

function openToolAccess(id) {
  const t = byId(state.tools, id);
  if (!t?.url) return;
  window.open(t.url, '_blank', 'noopener');
}

function renderTools() {
  const toolsGrid = document.getElementById('toolsGrid');
  if (!toolsGrid) return;
  const tools = getActiveItems(state.tools);
  toolsGrid.innerHTML = tools.length
    ? tools.map(t => `<div class="tool-card">
        <div class="tool-card-head">
          <img class="tool-logo" src="${esc(t.logo || 'assets/icons/Icones/System/apps-2-line.svg')}" alt="" onerror="this.onerror=null;this.src='assets/icons/Icones/System/apps-2-line.svg'">
          <h3 class="tool-title">${esc(t.name)}</h3>
        </div>
        <div class="tool-desc">${esc(t.description || '')}</div>
        <div class="tool-actions">
          <button class="fr-btn secondary small" type="button" onclick="showToolInfo('${t.id}')">Informations</button>
          <button class="fr-btn small" type="button" onclick="openToolAccess('${t.id}')">AccÃ©der</button>
        </div>
      </div>`).join('')
    : '<p class="help">Aucun outil enregistrÃ©.</p>';
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 13. MODULE PLANIFICATION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function openPlanForm(id) {
  const p = id ? byId(state.planItems, id) : null;
  document.getElementById('planId').value = p?.id || '';
  setSelectOptions(document.getElementById('planType'), getDynamicList('planTypes'), p?.type);
  setSelectOptions(document.getElementById('planPriority'), getDynamicList('planPriorities'), p?.priority);
  setSelectOptions(document.getElementById('planRisk'), getDynamicList('planRiskTypes'), p?.risk);
  setSelectOptions(document.getElementById('planStatus'), getDynamicList('planStatuses'), p?.status);
  document.getElementById('planItem').value = p?.item || '';
  document.getElementById('planApproval').value = p?.approvalDate || '';
  document.getElementById('planObservation').value = p?.observation || '';
  document.getElementById('planUrl').value = p?.url || '';
  document.getElementById('planningDialog').showModal();
}

function savePlanItem() {
  const id = document.getElementById('planId').value || uid('plan');
  const existing = byId(state.planItems, id);
  const typeSnapshot = getReferenceSnapshot('planTypes', document.getElementById('planType').value);
  const riskSnapshot = getReferenceSnapshot('planRiskTypes', document.getElementById('planRisk').value.trim());
  const prioritySnapshot = getReferenceSnapshot('planPriorities', document.getElementById('planPriority').value);
  const statusSnapshot = getReferenceSnapshot('planStatuses', document.getElementById('planStatus').value);
  const data = {
    id,
    type: typeSnapshot.label,
    typeId: typeSnapshot.id,
    typeLabelSnapshot: typeSnapshot.label,
    risk: riskSnapshot.label,
    riskTypeId: riskSnapshot.id,
    riskLabelSnapshot: riskSnapshot.label,
    item: document.getElementById('planItem').value.trim(),
    priority: prioritySnapshot.label,
    priorityId: prioritySnapshot.id,
    priorityLabelSnapshot: prioritySnapshot.label,
    status: statusSnapshot.label,
    statusId: statusSnapshot.id,
    statusLabelSnapshot: statusSnapshot.label,
    approvalDate: document.getElementById('planApproval').value,
    observation: document.getElementById('planObservation').value.trim(),
    url: document.getElementById('planUrl').value.trim()
  };
  if (!data.item) { showToast("L'item de planification est requis.", 'error'); return; }
  if (existing) Object.assign(existing, data);
  else state.planItems.unshift(data);
  persist();
  document.getElementById('planningDialog').close();
  renderPlanning();
}

function deletePlanItem(id) {
  window.SICODDataModel?.archiveRecord(state.planItems, id);
  persist();
  renderPlanning();
}

function renderPlanning() {
  applyPlanExpiryRules();
  const planningList = document.getElementById('planningList');
  const planningSummary = document.getElementById('planningSummary');
  if (!planningList) return;

  const q = (document.getElementById('planningSearch')?.value || '').toLowerCase().trim();
  const allItems = getActiveItems(state.planItems);
  const items = q
    ? allItems.filter(p => [p.type, p.risk, p.item, p.priority, p.status, p.observation].join(' ').toLowerCase().includes(q))
    : allItems;
  planningList.innerHTML = items.length
    ? `<table class="table"><thead><tr><th>Type</th><th>Risque</th><th>Item</th><th>PrioritÃ©</th><th>Statut</th><th>Date d'approbation</th><th>Observation</th><th>Actions</th></tr></thead><tbody>${
        items.map(p => `<tr>
          <td>${esc(p.type || '')}</td>
          <td>${esc(p.risk || '')}</td>
          <td>${esc(p.item || '')}</td>
          <td>${esc(p.priority || '')}</td>
          <td>${badge(p.status || '')}${isPlanExpired(p) ? ' <span class="badge expired">ExpirÃ©</span>' : ''}</td>
          <td>${esc(p.approvalDate || '')}</td>
          <td>${esc(p.observation || '')}</td>
          <td><div class="list-actions plan-actions-single">
            <button class="fr-btn secondary small" type="button" onclick="openPlanForm('${p.id}')">Modifier</button>
            ${p.url ? `<a class="fr-btn small" href="${esc(p.url)}" target="_blank" rel="noopener">AccÃ©der</a>` : ''}
          </div></td>
        </tr>`).join('')
      }</tbody></table>`
    : (window.SICODUI?.setEmptyState?.('Aucune planification. Ajouter un premier item.', 'Ajouter une planification', 'openPlanForm()') || '<p class="help">Aucun item de planification.</p>');

  if (planningSummary) {
    const counts = {};
    getDynamicList('planStatuses').forEach(s => counts[s] = items.filter(i => i.status === s).length);
    planningSummary.innerHTML = `<div class="kpis"><div class="kpi"><strong>${items.length}</strong><span>Total tous statuts</span></div>${getDynamicList('planStatuses').map(s => `<div class="kpi"><strong>${counts[s] || 0}</strong><span>${esc(s)}</span></div>`).join('')}</div>`;
  }

  ensurePlanningStatsUI();
  renderPlanningStats();
}

function exportPlanningCSV() {
  const rows = [['Type de plan','Risque','Item','PrioritÃ©','Statut',"Date d'approbation",'Observation'],
    ...getActiveItems(state.planItems).map(p => [p.type||'',p.risk||'',p.item||'',p.priority||'',p.status||'',p.approvalDate||'',p.observation||''])];
  downloadCSV('planification.csv', rows);
}

function exportPlanningPDF() {
  const items = getActiveItems(state.planItems);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const palette = getPdfAppearance();
  const blue = palette.primary, soft = palette.accent, text = palette.text;
  const marginX = 10;
  const pageW = doc.internal.pageSize.getWidth();
  const title = 'Tableau de suivi de la planification ORSEC';
  let y = 10;
  addLogoPreserved(doc, marginX, y, 30, 16);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...text); doc.setFontSize(16);
  doc.text(title, pageW / 2, y + 9, { align: 'center' }); y += 20;
  const headers = ['Type','Risque','Item','PrioritÃ©','Statut','Approbation','Observation'];
  const widths = [28,40,60,24,28,26,pageW - (marginX * 2) - 28 - 40 - 60 - 24 - 28 - 26];
  const drawHeader = () => {
    let x = marginX;
    headers.forEach((h, i) => {
      doc.setFillColor(...soft); doc.rect(x, y, widths[i], 8, 'F');
      doc.setDrawColor(180); doc.rect(x, y, widths[i], 8);
      doc.setTextColor(...text); doc.setFontSize(8); doc.setFont('helvetica','bold');
      doc.text(h, x + widths[i] / 2, y + 5, { align: 'center' }); x += widths[i];
    });
    y += 8;
  };
  drawHeader();
  items.forEach(p => {
    const vals = [p.type||'',p.risk||'',p.item||'',p.priority||'',p.status||'',p.approvalDate||'',p.observation||''];
    const lines = vals.map((v, i) => doc.splitTextToSize(String(v), widths[i] - 3));
    const h = Math.max(...lines.map(l => l.length), 1) * 4 + 4;
    if (y + h > 200) { doc.addPage(); y = 10; addLogoPreserved(doc, marginX, y, 30, 16); doc.setFont('helvetica','bold'); doc.setTextColor(...text); doc.setFontSize(16); doc.text(title, pageW / 2, y + 9, { align: 'center' }); y += 20; drawHeader(); }
    let x = marginX;
    lines.forEach((l, i) => { doc.setDrawColor(180); doc.rect(x, y, widths[i], h); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(l, x + widths[i] / 2, y + 4.5, { align: 'center', maxWidth: widths[i]-3 }); x += widths[i]; });
    y += h;
  });
  doc.save('planification.pdf');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 14. MODULE STATISTIQUES DE PLANIFICATION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function chartColor(i) {
  const palette = ['#000091','#6a6af4','#b34000','#18753c','#c9191e','#7a5c00','#5b3a99','#0063cb'];
  return palette[i % palette.length];
}

function buildBarChart(title, rows) {
  const clean = rows.filter(r => r && r.label);
  if (!clean.length) return `<div class="stats-card"><h3>${esc(title)}</h3><p class="chart-empty">Aucune donnÃ©e.</p></div>`;
  const max = Math.max(...clean.map(r => r.value), 1);
  const barH = 24, gap = 10, labelW = 160, width = 640, chartW = width - labelW - 40;
  const height = clean.length * (barH + gap) + 10;
  const svg = clean.map((r, i) => {
    const y = i * (barH + gap) + 4;
    const w = Math.max(2, Math.round((r.value / max) * chartW));
    return `<text x="0" y="${y + 16}" font-size="12" fill="currentColor">${esc(r.label)}</text><rect x="${labelW}" y="${y}" width="${w}" height="${barH}" rx="3" fill="${chartColor(i)}"></rect><text x="${labelW + w + 8}" y="${y + 16}" font-size="12" fill="currentColor">${r.value}</text>`;
  }).join('');
  return `<div class="stats-card"><h3>${esc(title)}</h3><svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet">${svg}</svg></div>`;
}

function buildDonutChart(title, rows) {
  const clean = rows.filter(r => r.value > 0);
  if (!clean.length) return `<div class="stats-card"><h3>${esc(title)}</h3><p class="chart-empty">Aucune donnÃ©e.</p></div>`;
  const total = clean.reduce((a, b) => a + b.value, 0);
  let acc = 0;
  const segs = clean.map((r, i) => { const start = acc / total * 360; acc += r.value; return { r, i, start, end: acc / total * 360 }; });
  const polar = (cx, cy, radius, a) => { const rad = (a - 90) * Math.PI / 180; return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }; };
  const pathd = (cx, cy, r1, r2, a0, a1) => { const p1 = polar(cx, cy, r2, a0), p2 = polar(cx, cy, r2, a1), p3 = polar(cx, cy, r1, a1), p4 = polar(cx, cy, r1, a0); const large = (a1 - a0) > 180 ? 1 : 0; return `M ${p1.x} ${p1.y} A ${r2} ${r2} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r1} ${r1} 0 ${large} 0 ${p4.x} ${p4.y} Z`; };
  const svgSegs = segs.map(s => `<path d="${pathd(110,110,48,90,s.start,s.end)}" fill="${chartColor(s.i)}"></path>`).join('');
  const legend = clean.map((r, i) => `<div><span>${esc(r.label)}</span><strong>${r.value}</strong></div>`).join('');
  return `<div class="stats-card"><h3>${esc(title)}</h3><div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap"><svg class="chart-svg" viewBox="0 0 220 220" style="max-width:220px"><circle cx="110" cy="110" r="48" fill="transparent"></circle>${svgSegs}<text x="110" y="105" text-anchor="middle" font-size="12" fill="currentColor">Total</text><text x="110" y="122" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">${total}</text></svg><div class="chart-legend" style="min-width:12rem">${legend}</div></div></div>`;
}

function getPlanningStatsData() {
  const items = getActiveItems(state.planItems);
  const countBy = (key, values) => values.map(v => ({ label: v, value: items.filter(i => (i[key]||'') === v).length }));
  const risks = {}; items.forEach(i => { const k = (i.risk || 'Non renseignÃ©').trim(); risks[k] = (risks[k] || 0) + 1; });
  const riskRows = Object.entries(risks).sort((a,b) => b[1]-a[1]).slice(0,8).map(([label,value]) => ({label,value}));
  const years = {}; items.forEach(i => { const y = (i.approvalDate||'').slice(0,4) || 'Sans date'; years[y] = (years[y] || 0) + 1; });
  const yearRows = Object.entries(years).sort((a,b) => String(a[0]).localeCompare(String(b[0]))).map(([label,value]) => ({label,value}));
  return {
    types: countBy('type', getDynamicList('planTypes')),
    statuses: countBy('status', getDynamicList('planStatuses')),
    priorities: countBy('priority', getDynamicList('planPriorities')),
    risks: riskRows, years: yearRows
  };
}

function renderPlanningStats() {
  const body = document.getElementById('planningStatsBody');
  if (!body) return;
  const s = getPlanningStatsData();
  body.innerHTML = `<div class="stats-grid">
    ${buildBarChart('Plans par type', s.types)}
    ${buildDonutChart('RÃ©partition par statut', s.statuses)}
    ${buildBarChart('PrioritÃ©s', s.priorities)}
    ${buildBarChart('Typologies de risque les plus frÃ©quentes', s.risks)}
    ${buildBarChart("Dates d'approbation par annÃ©e", s.years)}
  </div>`;
}

function exportPlanningStatsCSV() {
  const s = getPlanningStatsData();
  const rows = [['Section','LibellÃ©','Valeur']];
  [['Types',s.types],['Statuts',s.statuses],['PrioritÃ©s',s.priorities],['Risques',s.risks],['AnnÃ©es',s.years]].forEach(([section,data]) => data.forEach(r => rows.push([section,r.label,r.value])));
  downloadCSV('planification-statistiques.csv', rows);
}

function exportPlanningStatsPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const s = getPlanningStatsData();
  addPdfHeader(doc, 'STATISTIQUES DE PLANIFICATION');
  let y = 34;
  [['Plans par type',s.types],['RÃ©partition par statut',s.statuses],['PrioritÃ©s',s.priorities],['Typologies de risque',s.risks],["Dates d'approbation par annÃ©e",s.years]].forEach(([title,data]) => { y = addPdfStatTable(doc, y, title, data); });
  doc.save('planification-statistiques.pdf');
}

function addPdfHeader(doc, title) {
  const blue = getPdfAppearance().primary;
  addLogoPreserved(doc, 12, 8, 24, 16);
  doc.setTextColor(...blue); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(title, 105, 18, { align: 'center' }); doc.setTextColor(22,22,22);
}

function addPdfStatTable(doc, y, title, data) {
  const palette = getPdfAppearance();
  const blue = palette.primary; const pageH = doc.internal.pageSize.getHeight();
  if (y > 260) { doc.addPage(); y = 15; }
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue); doc.setFontSize(12);
  doc.text(title, 12, y); y += 4; doc.setFont('helvetica', 'normal'); doc.setTextColor(22,22,22);
  doc.setFillColor(...palette.accent); doc.rect(12, y, 136, 7, 'F'); doc.rect(148, y, 50, 7, 'F'); doc.setDrawColor(180); doc.rect(12, y, 136, 7); doc.rect(148, y, 50, 7);
  doc.setTextColor(22,22,22); doc.text('LibellÃ©', 16, y + 4.5); doc.text('Valeur', 173, y + 4.5, { align: 'center' }); y += 7;
  (data.length ? data : [{ label: 'Aucune donnÃ©e', value: 0 }]).forEach(r => {
    if (y > pageH - 12) { doc.addPage(); y = 15; }
    doc.setTextColor(22,22,22); doc.setDrawColor(180);
    doc.rect(12, y, 136, 7); doc.rect(148, y, 50, 7);
    doc.text(String(r.label), 16, y + 4.5, { maxWidth: 128 }); doc.text(String(r.value), 173, y + 4.5, { align: 'center' }); y += 7;
  });
  return y + 6;
}

function ensurePlanningStatsUI() {
  const page = document.getElementById('page-planning');
  if (!page || document.getElementById('planningSubtabs')) return;
  const inner = page.querySelector('.page-inner');
  const header = page.querySelector('.page-header');
  if (!inner || !header) return;
  const cards = [...inner.querySelectorAll(':scope > .card')];
  const tabs = document.createElement('div');
  tabs.className = 'page-subtabs'; tabs.id = 'planningSubtabs';
  tabs.innerHTML = `<button class="page-subtab active" type="button" onclick="showPlanningSection('overview')">Suivi</button><button class="page-subtab" type="button" onclick="showPlanningSection('stats')">Statistiques</button>`;
  header.after(tabs);
  const overview = document.createElement('div'); overview.id = 'planningOverview'; overview.className = 'page-subpanel active';
  cards.forEach(c => overview.appendChild(c));
  const stats = document.createElement('div'); stats.id = 'planningStats'; stats.className = 'page-subpanel';
  stats.innerHTML = `<div class="card"><div class="card-header"><h2 class="card-title">Statistiques</h2><div class="stats-toolbar"><button class="fr-btn secondary small" type="button" onclick="exportPlanningStatsCSV()">Exporter CSV</button><button class="fr-btn secondary small" type="button" onclick="exportPlanningStatsPDF()">Exporter PDF</button></div></div><div class="card-body" id="planningStatsBody"></div></div>`;
  inner.appendChild(overview); inner.appendChild(stats);
}

function showPlanningSection(which) {
  document.querySelectorAll('#planningSubtabs .page-subtab').forEach((btn, idx) =>
    btn.classList.toggle('active', (which === 'overview' && idx === 0) || (which === 'stats' && idx === 1)));
  document.getElementById('planningOverview')?.classList.toggle('active', which === 'overview');
  document.getElementById('planningStats')?.classList.toggle('active', which === 'stats');
  if (which === 'stats') renderPlanningStats();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 15. MODULE ASTREINTES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function syncDutyPeriodFromMonth() {
  const dutyMonth = document.getElementById('dutyMonth');
  if (!dutyMonth || !dutyMonth.value) return;
  const [y, m] = dutyMonth.value.split('-').map(Number);
  if (!y || !m) return;
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const startEl = document.getElementById('dutyPeriodStart');
  const endEl = document.getElementById('dutyPeriodEnd');
  if (startEl) startEl.value = toLocalISO(first);
  if (endEl) endEl.value = toLocalISO(last);
}

function openDutyAvailabilityForm(id) {
  const a = id ? byId(state.dutyAvailabilities, id) : null;
  document.getElementById('dutyId').value = a?.id || '';
  setSelectOptions(document.getElementById('dutyRole'), getDynamicList('dutyRoles'), a?.role || getDynamicList('dutyRoles')[0]);
  setSelectOptions(document.getElementById('dutyAgent'), getDynamicList('dutyAgents'), a?.agent || getDynamicList('dutyAgents')[0] || '');
  document.getElementById('dutyStart').value = a?.start || todayISO();
  document.getElementById('dutyEnd').value = a?.end || todayISO();
  document.getElementById('dutyNote').value = a?.note || '';
  document.getElementById('dutyDialog').showModal();
}

function saveDutyAvailability() {
  const id = document.getElementById('dutyId').value || uid('duty');
  const existing = byId(state.dutyAvailabilities, id);
  const agentSnapshot = getReferenceSnapshot('dutyAgents', document.getElementById('dutyAgent').value);
  const roleSnapshot = getReferenceSnapshot('dutyRoles', document.getElementById('dutyRole').value);
  const data = {
    id,
    agent: agentSnapshot.label,
    agentId: agentSnapshot.id,
    agentLabelSnapshot: agentSnapshot.label,
    role: roleSnapshot.label,
    roleId: roleSnapshot.id,
    roleLabelSnapshot: roleSnapshot.label,
    start: document.getElementById('dutyStart').value,
    end: document.getElementById('dutyEnd').value,
    note: document.getElementById('dutyNote').value.trim()
  };
  if (!data.agent || !data.role) { showToast("SÃ©lectionnez un agent et un rÃ´le d'astreinte.", 'error'); return; }
  if (!data.start || !data.end || data.end < data.start) { showToast("DÃ©finissez une pÃ©riode de disponibilitÃ© valide.", 'error'); return; }
  if (existing) Object.assign(existing, data);
  else state.dutyAvailabilities.push(data);
  persist();
  document.getElementById('dutyDialog').close();
  renderDutyCalendar();
  renderDutyAvailabilityList();
}

function deleteDutyAvailability(id) {
  window.SICODDataModel?.archiveRecord(state.dutyAvailabilities, id);
  persist();
  renderDutyCalendar();
  renderDutyAvailabilityList();
}

function renderDutyAvailabilityList() {
  const el = document.getElementById('dutyAvailabilityList');
  if (!el) return;
  const items = getActiveItems(state.dutyAvailabilities);
  el.innerHTML = items.length
    ? `<table class="table"><thead><tr><th>Agent</th><th>RÃ´le</th><th>PÃ©riode</th><th>Observation</th><th>Actions</th></tr></thead><tbody>${
        items.map(a => `<tr>
          <td>${esc(a.agent)}</td><td>${esc(a.role)}</td>
          <td>${esc(a.start)} â†’ ${esc(a.end)}</td><td>${esc(a.note||'')}</td>
          <td><div class="list-actions">
            <button class="fr-btn secondary small" type="button" onclick="openDutyAvailabilityForm('${a.id}')">Modifier</button>
            <button class="fr-btn danger small" type="button" onclick="deleteDutyAvailability('${a.id}')">Supprimer</button>
          </div></td>
        </tr>`).join('')
      }</tbody></table>`
    : (window.SICODUI?.setEmptyState?.('Aucune disponibilitÃ© saisie. Ajouter une disponibilitÃ©.', 'Ajouter une disponibilitÃ©', 'openDutyAvailabilityForm()') || '<p class="help">Aucune disponibilitÃ© saisie.</p>');
}

function renderDutyCalendar() {
  const dutyCalendar = document.getElementById('dutyCalendar');
  if (!dutyCalendar) return;

  const dutyMonth = document.getElementById('dutyMonth');
  const monthVal = dutyMonth?.value || todayISO().slice(0, 7);
  if (dutyMonth && !dutyMonth.value) dutyMonth.value = monthVal;

  setSelectOptions(document.getElementById('dutyRoleFilter'), ['', ...getDynamicList('dutyRoles')], document.getElementById('dutyRoleFilter')?.value || '');
  setSelectOptions(document.getElementById('dutyAgentFilter'), ['', ...getDynamicList('dutyAgents')], document.getElementById('dutyAgentFilter')?.value || '');

  const [year, month] = monthVal.split('-').map(Number);
  if (!year || !month) return;
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);

  const filterRole = document.getElementById('dutyRoleFilter')?.value || '';
  const filterAgent = document.getElementById('dutyAgentFilter')?.value || '';

  let html = '<div class="calendar-grid">' + ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => `<div class="calendar-head">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const day = new Date(start); day.setDate(start.getDate() + i);
    const iso = toLocalISO(day);
    const inMonth = day.getMonth() === (month - 1);
    const tags = getActiveItems(state.dutyAvailabilities).filter(a => {
      const ds = parseDateLocal(a.start), de = parseDateLocal(a.end), cur = parseDateLocal(iso);
      return ds && de && cur && cur >= ds && cur <= de && (!filterRole || a.role === filterRole) && (!filterAgent || a.agent === filterAgent);
    });
    html += `<div class="calendar-cell" style="opacity:${inMonth ? 1 : .5}"><div class="calendar-daynum">${day.getDate()}</div><div class="calendar-tags">${tags.map(t => `<span class="calendar-tag">${esc(t.agent)} Â· ${esc(t.role)}</span>`).join('')}</div></div>`;
  }
  html += '</div>';
  dutyCalendar.innerHTML = html;
}

function generateDutySchedule() {
  const startVal = document.getElementById('dutyPeriodStart')?.value || todayISO();
  const endVal = document.getElementById('dutyPeriodEnd')?.value || startVal;
  const startInput = parseDateLocal(startVal), endInput = parseDateLocal(endVal);
  if (!startInput || !endInput || endInput < startInput) { showToast('DÃ©finissez une pÃ©riode de planning valide.', 'error'); return; }

  const roles = getDynamicList('dutyRoles');
  const role1 = roles[0] || 'Astreinte 1', role2 = roles[1] || 'Astreinte 2';
  const start = startOfMonday(startInput);
  const availability = getActiveItems(state.dutyAvailabilities).map(a => ({ ...a, ds: parseDateLocal(a.start), de: parseDateLocal(a.end) })).filter(a => a.ds && a.de);

  const weeks = [];
  for (let cur = new Date(start); cur <= endInput; cur.setDate(cur.getDate() + 7)) {
    const ws = new Date(cur);
    weeks.push({ start: new Date(ws), end: weekEndInclusive(ws) });
  }

  const assignmentCount = {}, lastAssignedWeek = {};

  const selectAgent = (role, week, weekIndex, usedThisWeek) => {
    const key = agentName => `${role}||${agentName}`;
    const exact = availability.filter(a => a.role === role && a.ds <= week.start && a.de >= week.end && !usedThisWeek.has(a.agent));
    const fallback = availability.filter(a => a.role === role && !(a.de < week.start || a.ds > week.end) && !usedThisWeek.has(a.agent));
    const pool = (exact.length ? exact : fallback).map(a => ({
      a, key: key(a.agent),
      score: (assignmentCount[key(a.agent)] || 0) * 100 + (lastAssignedWeek[key(a.agent)] === weekIndex - 1 ? 1000 : 0)
    })).sort((x, y) => x.score - y.score || x.a.agent.localeCompare(y.a.agent));
    if (!pool.length) return null;
    const chosen = pool[0].a;
    const k = key(chosen.agent);
    assignmentCount[k] = (assignmentCount[k] || 0) + 1;
    lastAssignedWeek[k] = weekIndex;
    usedThisWeek.add(chosen.agent);
    return { name: chosen.agent };
  };

  state.dutySchedule = weeks.map((week, idx) => {
    const used = new Set();
    return {
      id: uid('week'),
      start: toLocalISO(week.start),
      end: toLocalISO(week.end),
      agent1: selectAgent(role1, week, idx, used),
      agent2: selectAgent(role2, week, idx, used)
    };
  });
  persist();
  renderDutySchedule();
  renderDutyStats();
}

function renderDutySchedule() {
  const el = document.getElementById('dutyScheduleList');
  if (!el) return;
  const rows = state.dutySchedule || [];
  const roles = getDynamicList('dutyRoles');
  const role1 = roles[0] || 'Astreinte 1', role2 = roles[1] || 'Astreinte 2';
  const activeAvailabilities = getActiveItems(state.dutyAvailabilities);
  const agents1 = ['', ...new Set(activeAvailabilities.filter(a => a.role === role1).map(a => a.agent).filter(Boolean))];
  const agents2 = ['', ...new Set(activeAvailabilities.filter(a => a.role === role2).map(a => a.agent).filter(Boolean))];

  el.innerHTML = rows.length
    ? `<div class="week-list">${rows.map((w, i) => `<div class="week-card">
        <strong>Semaine du ${formatDateLocal(parseDateLocal(w.start))} au ${formatDateLocal(parseDateLocal(w.end))}</strong>
        <div class="grid-2" style="margin-top:.75rem">
          <div class="week-assignment"><div class="help">${esc(role1)}</div><select onchange="updateDutyAssignment(${i},'agent1',this.value)">${agents1.map(name => `<option value="${esc(name)}" ${(w.agent1?.name||'')===name?'selected':''}>${esc(name||'Aucun agent disponible')}</option>`).join('')}</select></div>
          <div class="week-assignment"><div class="help">${esc(role2)}</div><select onchange="updateDutyAssignment(${i},'agent2',this.value)">${agents2.map(name => `<option value="${esc(name)}" ${(w.agent2?.name||'')===name?'selected':''}>${esc(name||'Aucun agent disponible')}</option>`).join('')}</select></div>
        </div>
      </div>`).join('')}</div>`
    : '<p class="help">Aucun planning gÃ©nÃ©rÃ©.</p>';

  ensureDutyStatsUI();
  renderDutyStats();
}

function updateDutyAssignment(index, key, value) {
  if (!state.dutySchedule?.[index]) return;
  state.dutySchedule[index][key] = value ? { name: value } : null;
  persist();
  renderDutySchedule();
}

function exportDutyPDF() {
  if (!(state.dutySchedule || []).length) { showToast("GÃ©nÃ©rez d'abord le planning d'astreinte.", 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const palette = getPdfAppearance();
  const pageW = 210, m = 12, blue = palette.primary, soft = palette.accent, text = palette.text;
  let y = 10;
  addLogoPreserved(doc, m, y, 28, 18);
  doc.setTextColor(...text); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('CABINET', pageW - m, y + 5, { align: 'right' });
  doc.text('SIRACEDPC', pageW - m, y + 11, { align: 'right' });
  doc.setFontSize(13);
  doc.text("TABLEAU DES MISES SOUS ASTREINTES QUALIFIÃ‰ES Â« COD Â»", pageW / 2, y + 24, { align: 'center' });
  y += 34; doc.setTextColor(...text); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const startDateStr = state.dutySchedule[0]?.start || '';
  const endDateStr = state.dutySchedule[state.dutySchedule.length - 1]?.end || '';
  const startPeriod = parseDateLocal(document.getElementById('dutyPeriodStart')?.value || startDateStr);
  const endPeriod = parseDateLocal(document.getElementById('dutyPeriodEnd')?.value || endDateStr);
  const introText = `Les astreintes qualifiÃ©es Â« dÃ©fense et sÃ©curitÃ© civiles Â», pour la pÃ©riode comprise entre le ${startPeriod ? formatDateLocal(startPeriod) : '...'} et le ${endPeriod ? formatDateLocal(endPeriod) : '...'}, doivent Ãªtre prises en compte comme suit :`;
  doc.text(doc.splitTextToSize(introText, 186), m, y); y += 14;
  const headers = ['PÃ©riode', 'Astreinte 1', 'Astreinte 2'];
  const widths = [72, 58, 58];
  const drawHeader = () => {
    let x = m;
    headers.forEach((h, i) => { doc.setFillColor(...soft); doc.rect(x, y, widths[i], 8, 'F'); doc.setDrawColor(180); doc.rect(x, y, widths[i], 8); doc.setFont('helvetica','bold'); doc.setTextColor(...text); doc.text(h, x + widths[i]/2, y + 5, { align:'center' }); x += widths[i]; });
    y += 8; doc.setFont('helvetica', 'normal');
  };
  drawHeader();
  state.dutySchedule.forEach(w => {
    const startDt = parseDateLocal(w.start), endDt = parseDateLocal(w.end);
    const vals = [
      `${startDt ? formatDateLocal(startDt) : w.start} au ${endDt ? formatDateLocal(endDt) : w.end}`,
      w.agent1?.name || 'â€”',
      w.agent2?.name || 'â€”'
    ];
    const lines = vals.map((v, i) => doc.splitTextToSize(v, widths[i] - 4));
    const h = Math.max(...lines.map(l => l.length)) * 4 + 4;
    if (y + h > 250) { doc.addPage(); y = 10; addLogoPreserved(doc, m, y, 28, 18); doc.setTextColor(...text); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text('CABINET', pageW - m, y + 5, {align:'right'}); doc.text('SIRACEDPC', pageW - m, y + 11, {align:'right'}); doc.setFontSize(13); doc.text("TABLEAU DES MISES SOUS ASTREINTES QUALIFIÃ‰ES Â« COD Â»", pageW / 2, y + 24, { align: 'center' }); y += 34; drawHeader(); }
    let x = m;
    lines.forEach((l, i) => { doc.setDrawColor(180); doc.rect(x, y, widths[i], h); doc.text(l, x + widths[i]/2, y + 5, { align:'center', maxWidth: widths[i]-4 }); x += widths[i]; });
    y += h;
  });
  y = Math.max(y + 10, 240);
  if (shouldApplyPdfSignature('duty')) {
    const signLast = state.settings.dutySignerLastName || 'HAUPTMANN';
    const signFirst = state.settings.dutySignerFirstName || 'Nicolas';
    const signFunction = state.settings.dutySignerFunction || 'le directeur de cabinet';
    const dutySig = { mode:'delegation', role: signFunction, name: `${signFirst} ${signLast}`.trim() || 'SIRACEDPC' };
    drawPdfSignatureBlock(doc, pageW - 62, y, { signature: dutySig, lineGap: 6, blockWidth: 50 });
  }
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  y = 276;
  doc.text('Place FÃ©lix Baret - CS 80001 â€“ 13282 Marseille Cedex 06', m, y); y += 4;
  doc.text('TÃ©lÃ©phone : 04.84.35.40.00 â€” www.bouches-du-rhone.gouv.fr', m, y);
  doc.save('planning-astreinte.pdf');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 16. MODULE STATISTIQUES ASTREINTES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getDutyStatsData(year) {
  const rows = (state.dutySchedule || []).filter(w => (w.start || '').slice(0, 4) === String(year));
  const roles = getDynamicList('dutyRoles');
  const role1 = roles[0] || 'Astreinte 1', role2 = roles[1] || 'Astreinte 2';
  const count = getter => {
    const m = {};
    rows.forEach(w => { const name = getter(w); if (name) m[name] = (m[name] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value }));
  };
  return { year, role1, role2, a1: count(w => w.agent1?.name || ''), a2: count(w => w.agent2?.name || '') };
}

function renderDutyStats() {
  const body = document.getElementById('dutyStatsBody');
  if (!body) return;
  const year = Number(document.getElementById('dutyStatsYear')?.value || new Date().getFullYear());
  const s = getDutyStatsData(year);
  body.innerHTML = `<div class="stats-grid">
    ${buildBarChart(`${s.role1} â€” rÃ©partition annuelle`, s.a1)}
    ${buildBarChart(`${s.role2} â€” rÃ©partition annuelle`, s.a2)}
  </div>`;
}

function exportDutyStatsCSV() {
  const year = Number(document.getElementById('dutyStatsYear')?.value || new Date().getFullYear());
  const s = getDutyStatsData(year);
  const rows = [['AnnÃ©e','RÃ´le','Agent','Semaines']];
  s.a1.forEach(r => rows.push([s.year, s.role1, r.label, r.value]));
  s.a2.forEach(r => rows.push([s.year, s.role2, r.label, r.value]));
  downloadCSV(`astreintes-statistiques-${s.year}.csv`, rows);
}

function exportDutyStatsPDF() {
  const year = Number(document.getElementById('dutyStatsYear')?.value || new Date().getFullYear());
  const s = getDutyStatsData(year);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  addPdfHeader(doc, `STATISTIQUES D'ASTREINTES ${s.year}`);
  let y = 34;
  y = addPdfStatTable(doc, y, `${s.role1} â€” rÃ©partition annuelle`, s.a1);
  y = addPdfStatTable(doc, y, `${s.role2} â€” rÃ©partition annuelle`, s.a2);
  doc.save(`astreintes-statistiques-${s.year}.pdf`);
}

function ensureDutyStatsUI() {
  const page = document.getElementById('page-duty');
  if (!page || document.getElementById('dutySubtabs')) return;
  const inner = page.querySelector('.page-inner');
  const header = page.querySelector('.page-header');
  if (!inner || !header) return;
  const grids = [...inner.querySelectorAll(':scope > .planning-grid')];
  const tabs = document.createElement('div'); tabs.className = 'page-subtabs'; tabs.id = 'dutySubtabs';
  tabs.innerHTML = `<button class="page-subtab active" type="button" onclick="showDutySection('planner')">Planning</button><button class="page-subtab" type="button" onclick="showDutySection('stats')">Statistiques</button>`;
  header.after(tabs);
  const planner = document.createElement('div'); planner.id = 'dutyPlanner'; planner.className = 'page-subpanel active';
  grids.forEach(g => planner.appendChild(g));
  const stats = document.createElement('div'); stats.id = 'dutyStatsPanel'; stats.className = 'page-subpanel';
  stats.innerHTML = `<div class="card"><div class="card-header"><h2 class="card-title">Statistiques annuelles des astreintes</h2><div class="stats-toolbar"><div><label style="margin:0 0 .25rem">AnnÃ©e</label><input id="dutyStatsYear" type="number" min="2020" max="2100" style="width:8rem" onchange="renderDutyStats()"></div><button class="fr-btn secondary small" type="button" onclick="exportDutyStatsCSV()">Exporter CSV</button><button class="fr-btn secondary small" type="button" onclick="exportDutyStatsPDF()">Exporter PDF</button></div></div><div class="card-body" id="dutyStatsBody"></div></div>`;
  inner.appendChild(planner); inner.appendChild(stats);
  const yearEl = document.getElementById('dutyStatsYear');
  if (yearEl && !yearEl.value) yearEl.value = String(new Date().getFullYear());
}

function showDutySection(which) {
  document.querySelectorAll('#dutySubtabs .page-subtab').forEach((btn, idx) =>
    btn.classList.toggle('active', (which === 'planner' && idx === 0) || (which === 'stats' && idx === 1)));
  document.getElementById('dutyPlanner')?.classList.toggle('active', which === 'planner');
  document.getElementById('dutyStatsPanel')?.classList.toggle('active', which === 'stats');
  if (which === 'stats') renderDutyStats();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 17. MODULE PARAMÃˆTRES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function showSettingsTab(tab) {
  const restricted = tab !== 'general';
  if (restricted && !isCurrentUserAdmin()) {
    tab = 'general';
    showToast("AccÃ¨s rÃ©servÃ© aux administrateurs.", 'error');
  }
  document.querySelectorAll('.settings-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.settingsTab === tab));
  document.querySelectorAll('[data-settings-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.settingsPanel === tab));
  const select = document.getElementById('settingsSectionSelect');
  if (select && select.value !== tab) select.value = tab;
  if (tab === 'users' && isCurrentUserAdmin()) {
    loadUserAdminDirectory();
  }
}

function isCurrentUserAdmin() {
  const authState = window.SICODApi?.system?.getAuthState?.() || {};
  return !!authState.isAdmin;
}

function ensureDatabaseSettingsPanel() {
  const pageInner = document.querySelector('#page-settings .page-inner');
  const tabs = document.querySelector('.settings-tabs');
  if (!pageInner || !tabs) return;
  if (!tabs.querySelector('[data-settings-tab="db"]')) {
    const button = document.createElement('button');
    button.className = 'settings-tab';
    button.type = 'button';
    button.dataset.settingsTab = 'db';
    button.textContent = 'BDD';
    button.onclick = () => showSettingsTab('db');
    const generalTab = tabs.querySelector('[data-settings-tab="general"]');
    if (generalTab?.nextSibling) tabs.insertBefore(button, generalTab.nextSibling);
    else tabs.appendChild(button);
  }
  if (!pageInner.querySelector('[data-settings-panel="db"]')) {
    const panel = document.createElement('div');
    panel.className = 'settings-panel';
    panel.dataset.settingsPanel = 'db';
    panel.innerHTML = `<div class="settings-grid" id="databaseSettingsGrid"></div>`;
    const generalPanel = pageInner.querySelector('[data-settings-panel="general"]');
    if (generalPanel?.nextSibling) pageInner.insertBefore(panel, generalPanel.nextSibling);
    else pageInner.appendChild(panel);
  }
}

function ensureUserSettingsPanel() {
  const pageInner = document.querySelector('#page-settings .page-inner');
  const tabs = document.querySelector('.settings-tabs');
  if (!pageInner || !tabs) return;
  if (!tabs.querySelector('[data-settings-tab="users"]')) {
    const button = document.createElement('button');
    button.className = 'settings-tab';
    button.type = 'button';
    button.dataset.settingsTab = 'users';
    button.textContent = 'Utilisateurs';
    button.onclick = () => showSettingsTab('users');
    tabs.appendChild(button);
  }
  if (!pageInner.querySelector('[data-settings-panel="users"]')) {
    const panel = document.createElement('div');
    panel.className = 'settings-panel';
    panel.dataset.settingsPanel = 'users';
    panel.innerHTML = `<div class="settings-grid" id="userAdminSettingsGrid"></div>`;
    pageInner.appendChild(panel);
  }
}

function ensureSettingsNavigatorUI() {
  ensureDatabaseSettingsPanel();
  ensureUserSettingsPanel();
  const tabs = document.querySelector('.settings-tabs');
  if (!tabs) return;
  const usersTab = tabs.querySelector('[data-settings-tab="users"]');
  if (usersTab) usersTab.textContent = 'Utilisateurs';
  let wrapper = document.querySelector('.settings-selector-row');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'settings-selector-row';
    wrapper.innerHTML = `<label for="settingsSectionSelect">Section des paramÃ¨tres</label><select id="settingsSectionSelect"></select>`;
    tabs.parentNode.insertBefore(wrapper, tabs);
  }
  const select = wrapper.querySelector('select');
  const options = Array.from(tabs.querySelectorAll('.settings-tab')).map(btn => ({
    value: btn.dataset.settingsTab,
    label: btn.textContent.trim()
  }));
  const admin = isCurrentUserAdmin();
  const filtered = options.filter((option) => admin || option.value === 'general');
  select.innerHTML = filtered.map(option => `<option value="${esc(option.value)}">${esc(option.label)}</option>`).join('');
  select.onchange = () => showSettingsTab(select.value);
  tabs.hidden = true;
}

function ensureSettingsCleanupUI() {
  const generalPanel = document.querySelector('[data-settings-panel="general"]');
  if (generalPanel) {
    Array.from(generalPanel.querySelectorAll('label')).forEach((label) => {
      const text = (label.textContent || '').trim().toLowerCase();
      if (text.includes('banniÃ¨re du tableau de bord') || text.includes('joindre une banniÃ¨re')) {
        const block = label.parentElement;
        if (block) block.hidden = true;
      }
    });
    const thumb = document.getElementById('settingDashboardBannerThumb');
    if (thumb) thumb.style.display = 'none';
    ['settingDashboardBanner', 'settingDashboardBannerFile'].forEach((id) => {
      const input = document.getElementById(id);
      if (input && input.parentElement) input.parentElement.hidden = true;
    });
  }

  document.querySelectorAll('#page-settings .card .list-actions').forEach((group) => {
    if (group.closest('.settings-footer-actions')) return;
    const labels = Array.from(group.querySelectorAll('button')).map((button) => (button.textContent || '').trim().toLowerCase());
    if (labels.length && labels.every((label) => label === 'enregistrer les paramètres' || label === 'enregistrer')) {
      group.hidden = true;
    }
  });
}

function ensureSettingsFooterActions() {
  const pageInner = document.querySelector('#page-settings .page-inner');
  if (!pageInner || document.getElementById('settingsFooterActions')) return;
  const wrap = document.createElement('div');
  wrap.id = 'settingsFooterActions';
  wrap.className = 'settings-footer-actions';
  wrap.innerHTML = `<button class="fr-btn" type="button" onclick="saveSettings()">Enregistrer les paramÃ¨tres</button>`;
  pageInner.appendChild(wrap);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 18. STYLES DYNAMIQUES (injected CSS pour les composants Stats/Branding)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
(function injectDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `\n  .page-subtabs{display:flex;gap:.5rem;flex-wrap:wrap;margin:-.25rem 0 1rem}
  .page-subtab{background:var(--bg-alt);border:1px solid var(--border);color:var(--blue-france);padding:.55rem .8rem;cursor:pointer;font-weight:700}
  .page-subtab.active{background:var(--blue-france);color:#fff}
  .page-subpanel{display:none}
  .page-subpanel.active{display:block}
  .stats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
  .stats-card{border:1px solid var(--border);background:#fff;padding:1rem}
  .stats-card h3{margin:0 0 .75rem;color:var(--blue-france);font-size:1rem}
  .chart-svg{width:100%;height:auto;display:block}
  .chart-legend{display:grid;gap:.35rem;margin-top:.75rem;font-size:.875rem}
  .chart-legend div{display:flex;justify-content:space-between;gap:.75rem}
  .chart-empty{color:var(--text-light);font-size:.875rem}
  .branding-preview{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:.75rem}
  .branding-preview img{max-height:4rem;max-width:12rem;object-fit:contain;border:1px solid var(--border);background:#fff;padding:.35rem}
  .stats-toolbar{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem;align-items:flex-end}
  html[data-theme='dark'] .stats-card{background:var(--bg-alt)}
  html[data-theme='dark'] .page-subtab{background:#20203a;border-color:var(--border)}
  html[data-theme='dark'] .page-subtab.active{background:var(--blue-france);color:#fff}
  @media (max-width:900px){.stats-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
})();

function refreshStorageStatus() {
  const label = document.getElementById('storageStatusLabel');
  if (!label) return;
  label.textContent = 'Base de donnÃ©e';
}

function ensureTopbarAuthAction() {
  const actions = document.querySelector('.top-actions');
  if (!actions) return;
  let button = document.getElementById('topbarLogoutBtn');
  if (!button) {
    const themeButton = actions.querySelector('.fr-btn');
    button = document.createElement('button');
    button.id = 'topbarLogoutBtn';
    button.className = 'fr-btn secondary small';
    button.type = 'button';
    button.textContent = 'DÃ©connexion';
    button.onclick = () => logoutSupabaseSession();
    if (themeButton) actions.insertBefore(button, themeButton);
    else actions.appendChild(button);
  }
  const authState = window.SICODApi?.system?.getAuthState?.() || {};
  button.hidden = !authState.authenticated;
}

function ensureAuthGateUI() {
  if (document.getElementById('authGate')) return;
  const gate = document.createElement('div');
  gate.id = 'authGate';
  gate.className = 'auth-gate';
  gate.hidden = true;
  gate.innerHTML = `
    <div class="auth-card">
      <div class="auth-card-head">
        <h2>Connexion SICOD</h2>
      </div>
      <form id="authGateForm" class="auth-form">
        <div class="field-stack">
          <label for="authEmail">Adresse e-mail</label>
          <input id="authEmail" type="email" autocomplete="username" required>
        </div>
        <div class="field-stack">
          <label for="authPassword">Mot de passe</label>
          <input id="authPassword" type="password" autocomplete="current-password" required>
        </div>
        <div class="list-actions">
          <button class="fr-btn" type="submit">Se connecter</button>
        </div>
        <p id="authGateStatus" class="help"></p>
      </form>
    </div>
  `;
  document.body.appendChild(gate);
  const form = gate.querySelector('#authGateForm');
  if (form) {
    form.addEventListener('submit', submitSupabaseLogin);
  }
}

function refreshAuthGate() {
  ensureAuthGateUI();
  const gate = document.getElementById('authGate');
  if (!gate) return;
  const authState = window.SICODApi?.system?.getAuthState?.() || { configured: false, authenticated: false };
  const requiresAuth = !!authState.configured && !authState.authenticated;
  gate.hidden = !requiresAuth;
  document.body.classList.toggle('auth-required', requiresAuth);
  const appLayout = document.getElementById('appLayout');
  if (appLayout) appLayout.hidden = requiresAuth;
  ensureTopbarAuthAction();
}

function updateAuthGateStatus(message, tone = 'info') {
  const mount = document.getElementById('authGateStatus');
  if (!mount) return;
  mount.className = tone === 'warning' ? 'help auth-warning' : (tone === 'success' ? 'help auth-success' : 'help');
  mount.textContent = message;
}

function applyRemoteStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const fresh = Object.assign(buildDefaultState(), snapshot);
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
  userAdminState.loaded = false;
  userAdminState.items = [];
  ensureStateIntegrity();
  applyTheme(state.settings.theme);
  renderAll();
  refreshStorageStatus();

  return true;
}

async function restoreRemoteStateAfterLogin() {
  const remoteState = await window.SICODApi?.system?.hydrateState?.();
  if (remoteState && typeof remoteState === 'object') {
    applyRemoteStateSnapshot(remoteState);
  } else {
    refreshStorageStatus();
  }
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message || 'Operation expirÃ©e.')), timeoutMs);
    })
  ]);
}

async function submitSupabaseLogin(event) {
  event?.preventDefault?.();
  const email = document.getElementById('authEmail')?.value?.trim() || '';
  const password = document.getElementById('authPassword')?.value || '';
  if (!email || !password) {
    updateAuthGateStatus('E-mail ou mot de passe incorrect', 'warning');
    return;
  }
  try {
    await withTimeout(
      window.SICODApi?.auth?.signInWithPassword?.(email, password),
      15000,
      'La connexion Supabase a expirÃ©. VÃ©rifie le rÃ©seau, le compte utilisateur ou la confirmation de l e-mail.'
    );
    refreshAuthGate();
    refreshStorageStatus();
    updateCloudStateStatus(`Connexion Supabase ouverte pour ${esc(email)}. Chargement de l Ã©tat distant...`, 'success');
    updateAuthGateStatus('Connexion rÃ©ussie', 'success');
    try {
      await withTimeout(
        restoreRemoteStateAfterLogin(),
        15000,
        'Le chargement de l Ã©tat distant a expirÃ©.'
      );
    } catch (error) {
      updateCloudStateStatus(`Connexion ouverte, mais chargement distant incomplet : ${esc(error.message || String(error))}`, 'warning');
    }
  } catch (error) {
    updateAuthGateStatus('E-mail ou mot de passe incorrect', 'warning');
    refreshAuthGate();
    refreshStorageStatus();
  }
}

async function logoutSupabaseSession() {
  try {
    await window.SICODApi?.auth?.signOut?.();
    updateCloudStateStatus('Session Supabase fermÃ©e. Le site repasse en mode verrouillÃ© tant quâ€™aucune reconnexion nâ€™est effectuÃ©e.', 'info');
  } catch (error) {
    updateCloudStateStatus(`DÃ©connexion Supabase impossible : ${esc(error.message || String(error))}`, 'warning');
  }
  clearLocalStateCache();
  resetStateToDefaults();
  userAdminState.loaded = false;
  userAdminState.items = [];
  renderAll();
  refreshAuthGate();
  refreshStorageStatus();

}

function syncHtmlTemplateEditorValue() {
  const textarea = document.getElementById('settingHtmlTemplateSource');
  const key = textarea?.dataset?.templateKey;
  if (!textarea || !key) return;
  window.SICODPdfTemplates?.setHtmlTemplate(state, key, textarea.value || '');
}

function loadSelectedHtmlTemplate() {
  const select = document.getElementById('settingHtmlTemplateKey');
  const textarea = document.getElementById('settingHtmlTemplateSource');
  if (!select || !textarea) return;
  const template = window.SICODPdfTemplates?.getHtmlTemplate(state, select.value);
  textarea.value = template?.html || '';
  textarea.dataset.templateKey = template?.id || '';
}

function populateHtmlTemplateEditor(preferredKey) {
  const select = document.getElementById('settingHtmlTemplateKey');
  if (!select) return;
  const templates = window.SICODPdfTemplates?.listHtmlTemplates(state) || [];
  const activeKey = preferredKey || select.value || templates[0]?.id || '';
  select.innerHTML = templates.map((template) => `<option value="${esc(template.id)}">${esc(template.label)}</option>`).join('');
  if (templates.some((template) => template.id === activeKey)) select.value = activeKey;
  else if (templates[0]) select.value = templates[0].id;
  loadSelectedHtmlTemplate();
}

function onHtmlTemplateSelectionChange() {
  syncHtmlTemplateEditorValue();
  loadSelectedHtmlTemplate();
}

function exportSelectedHtmlTemplate() {
  syncHtmlTemplateEditorValue();
  const select = document.getElementById('settingHtmlTemplateKey');
  const template = window.SICODPdfTemplates?.getHtmlTemplate(state, select?.value || '');
  if (!template) {
    showToast('Aucun modÃ¨le HTML sÃ©lectionnÃ©.', 'error');
    return;
  }
  downloadBlob(new Blob([template.html], { type: 'text/html;charset=utf-8' }), template.fileName || `${slugify(template.id || 'modele')}.html`);
  showToast('ModÃ¨le HTML exportÃ©.');
}

function triggerHtmlTemplateImport() {
  document.getElementById('settingHtmlTemplateImport')?.click();
}

async function importSelectedHtmlTemplate(file) {
  if (!file) return;
  const select = document.getElementById('settingHtmlTemplateKey');
  const key = select?.value || '';
  if (!key) {
    showToast('Aucun modÃ¨le HTML cible n est sÃ©lectionnÃ©.', 'error');
    return;
  }
  try {
    const content = await file.text();
    if (!String(content || '').trim()) throw new Error('Le fichier HTML est vide.');
    window.SICODPdfTemplates?.setHtmlTemplate(state, key, content);
    loadSelectedHtmlTemplate();
    showToast('ModÃ¨le HTML importÃ©.');
  } catch (error) {
    showToast(`Import HTML impossible : ${error.message || String(error)}`, 'error');
  } finally {
    const input = document.getElementById('settingHtmlTemplateImport');
    if (input) input.value = '';
  }
}

function resetSelectedHtmlTemplate() {
  const select = document.getElementById('settingHtmlTemplateKey');
  const key = select?.value || '';
  if (!key) return;
  window.SICODPdfTemplates?.resetHtmlTemplate(state, key);
  loadSelectedHtmlTemplate();
  showToast('ModÃ¨le HTML rÃ©initialisÃ©.');
}

function ensureHtmlTemplateSettingsCard() {
  const stack = document.querySelector('[data-settings-panel="exports"] .settings-stack');
  if (!stack || stack.querySelector('#htmlTemplateSettingsCard')) return;
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'htmlTemplateSettingsCard';
  card.innerHTML = `
    <div class="card-header"><h2 class="card-title">Maquettes HTML d'aperÃ§u et d'export</h2></div>
    <div class="card-body">
      <div class="grid-2">
        <div>
          <label for="settingHtmlTemplateKey">Document</label>
          <select id="settingHtmlTemplateKey" onchange="onHtmlTemplateSelectionChange()"></select>
        </div>
        <div class="list-actions" style="align-self:end">
          <button class="fr-btn secondary small" type="button" onclick="exportSelectedHtmlTemplate()">Exporter HTML</button>
          <button class="fr-btn secondary small" type="button" onclick="triggerHtmlTemplateImport()">Importer HTML</button>
          <button class="fr-btn secondary small" type="button" onclick="resetSelectedHtmlTemplate()">RÃ©initialiser</button>
        </div>
      </div>
      <input id="settingHtmlTemplateImport" type="file" accept=".html,text/html" style="display:none" onchange="importSelectedHtmlTemplate(this.files[0])">
      <div style="margin-top:1rem">
        <label for="settingHtmlTemplateSource">Code HTML</label>
        <textarea id="settingHtmlTemplateSource" class="code-area" spellcheck="false"></textarea>
      </div>
      <p class="help">Ces maquettes HTML permettent d'importer, d'exporter et d'harmoniser les aperÃ§us et les rendus PDF finaux Ã  partir d'une source unique.</p>
    </div>
  `;
  stack.insertBefore(card, stack.children[1] || null);
}

function ensureExportSettingsUI() {
  const tabs = document.querySelector('.settings-tabs');
  if (tabs && !tabs.querySelector('[data-settings-tab="exports"]')) {
    const usersTab = tabs.querySelector('[data-settings-tab="users"]');
    const button = document.createElement('button');
    button.className = 'settings-tab';
    button.type = 'button';
    button.dataset.settingsTab = 'exports';
    button.textContent = 'Exports PDF';
    button.onclick = () => showSettingsTab('exports');
    tabs.insertBefore(button, usersTab || null);
  }

  const pageInner = document.querySelector('#page-settings .page-inner');
  if (!pageInner) return;
  if (pageInner.querySelector('[data-settings-panel="exports"]')) {
    ensureHtmlTemplateSettingsCard();
    return;
  }
  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.dataset.settingsPanel = 'exports';
  panel.innerHTML = `<div class="settings-stack">
    <div class="card">
        <div class="card-header"><h2 class="card-title">Apparence des PDF</h2></div>
        <div class="card-body">
          <div class="grid-2">
            <div><label for="settingPdfPrimaryColor">Couleur principale</label><input id="settingPdfPrimaryColor" type="color"></div>
            <div><label for="settingPdfAccentColor">Couleur de fond des cartouches</label><input id="settingPdfAccentColor" type="color"></div>
            <div><label for="settingPdfTextColor">Couleur du texte</label><input id="settingPdfTextColor" type="color"></div>
            <div><label for="settingPdfAlertColor">Couleur d alerte</label><input id="settingPdfAlertColor" type="color"></div>
            <div><label for="settingPdfLogoScale">Taille du logo (%)</label><input id="settingPdfLogoScale" type="number" min="40" max="140" step="5"></div>
          </div>
          <p class="help">Ces rÃ©glages modifient simplement l habillage des exports sans toucher Ã  la matrice du document.</p>
        </div>
      </div>
  </div>`;
  const usersPanel = pageInner.querySelector('[data-settings-panel="users"]');
  pageInner.insertBefore(panel, usersPanel || null);
  ensureHtmlTemplateSettingsCard();
}

function countStateRecords(stateSnapshot) {
  const safe = stateSnapshot && typeof stateSnapshot === 'object' ? stateSnapshot : {};
  return {
    events: Array.isArray(safe.events) ? safe.events.length : 0,
    ps: Array.isArray(safe.ps) ? safe.ps.length : 0,
    commandMessages: Array.isArray(safe.commandMessages) ? safe.commandMessages.length : 0,
    contacts: Array.isArray(safe.contacts) ? safe.contacts.length : 0,
    tools: Array.isArray(safe.tools) ? safe.tools.length : 0,
    planItems: Array.isArray(safe.planItems) ? safe.planItems.length : 0,
    dutySchedule: Array.isArray(safe.dutySchedule) ? safe.dutySchedule.length : 0
  };
}

function updateCloudStateStatus(message, tone = 'info') {
  const mount = document.getElementById('cloudStateStatus');
  if (!mount) return;
  mount.className = `cloud-status-panel ${tone}`;
  mount.innerHTML = message;
}

function serializeCurrentState() {
  return JSON.stringify(state, null, 2);
}

function exportCurrentStateJson() {
  const blob = new Blob([serializeCurrentState()], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sicod-state-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  updateCloudStateStatus('Export JSON gÃ©nÃ©rÃ© depuis lâ€™Ã©tat courant de la session.', 'success');
}

async function checkSupabaseState() {
  updateCloudStateStatus('ContrÃ´le de Supabase en cours...', 'info');
  try {
    const remoteConfig = window.SICODApi.system.getRemoteConfig();
    if (remoteConfig.provider !== 'supabase' || !remoteConfig.enabled || !remoteConfig.supabaseUrl || !remoteConfig.supabaseAnonKey) {
      updateCloudStateStatus('Supabase nâ€™est pas encore configurÃ© dans les paramÃ¨tres gÃ©nÃ©raux.', 'warning');
      refreshStorageStatus();
      return null;
    }
    const [remoteStatePayload, remoteTemplates] = await Promise.all([
      window.SICODApi.system.getRemoteState(),
      window.SICODApi.system.getDocumentTemplates()
    ]);
    const counts = countStateRecords(remoteStatePayload?.state);
    const authState = window.SICODApi.system.getAuthState?.() || {};
    updateCloudStateStatus(`
      <strong>Supabase joignable.</strong><br>
      Support : Base de donnÃ©e<br>
      Utilisateur : ${esc(authState.email || 'non identifie')}<br>
      ModÃ¨les PDF : ${remoteTemplates.length}<br>
      Ã‰vÃ©nements : ${counts.events} Â· PS : ${counts.ps} Â· Messages : ${counts.commandMessages} Â· Contacts : ${counts.contacts}
    `, 'success');
    refreshStorageStatus();
  
    return remoteStatePayload;
  } catch (error) {
    updateCloudStateStatus(`ContrÃ´le Supabase impossible : ${esc(error.message || String(error))}`, 'warning');
    refreshStorageStatus();
    throw error;
  }
}

async function pushCurrentStateToSupabase() {
  updateCloudStateStatus('Envoi de lâ€™Ã©tat courant vers Supabase...', 'info');
  try {
    ensureStateIntegrity();
    await pushReferenceCatalogToSupabase();
    await window.SICODApi.system.pushRemoteState(state);
    const counts = countStateRecords(state);
    updateCloudStateStatus(`
      <strong>Synchronisation terminÃ©e.</strong><br>
      Ã‰vÃ©nements : ${counts.events} Â· PS : ${counts.ps} Â· Messages : ${counts.commandMessages} Â· Contacts : ${counts.contacts}
    `, 'success');
    refreshStorageStatus();
  
  } catch (error) {
    updateCloudStateStatus(`Synchronisation Supabase impossible : ${esc(error.message || String(error))}`, 'warning');
    refreshStorageStatus();
  }
}

async function reloadStateFromSupabase() {
  updateCloudStateStatus('Chargement de lâ€™Ã©tat Supabase en cours...', 'info');
  try {
    const payload = await window.SICODApi.system.getRemoteState();
    if (!payload?.state || typeof payload.state !== 'object') {
      updateCloudStateStatus('Supabase est joignable, mais aucun Ã©tat nâ€™est encore enregistrÃ©.', 'warning');
      refreshStorageStatus();
      return;
    }
    applyRemoteStateSnapshot(payload.state);
    await hydrateReferenceCatalogFromSupabase();
    renderAll();
    const counts = countStateRecords(state);
    updateCloudStateStatus(`
      <strong>Ã‰tat Supabase rechargÃ©.</strong><br>
      Ã‰vÃ©nements : ${counts.events} Â· PS : ${counts.ps} Â· Messages : ${counts.commandMessages} Â· Contacts : ${counts.contacts}
    `, 'success');
  } catch (error) {
    updateCloudStateStatus(`Rechargement Supabase impossible : ${esc(error.message || String(error))}`, 'warning');
    refreshStorageStatus();
  }
}

function bindCloudStateImport() {
  const input = document.getElementById('cloudStateImportFile');
  if (!input || input.dataset.bound === '1') return;
  input.dataset.bound = '1';
  input.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    updateCloudStateStatus(`Import de ${esc(file.name)} vers Supabase en cours...`, 'info');
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('Le fichier JSON ne contient pas un Ã©tat valide.');
      await window.SICODApi.system.pushRemoteState(parsed);
      const fresh = Object.assign(buildDefaultState(), parsed);
      Object.keys(state).forEach((key) => delete state[key]);
      Object.assign(state, fresh);
      ensureStateIntegrity();
      await pushReferenceCatalogToSupabase();
      applyTheme(state.settings.theme);
      renderAll();
      refreshStorageStatus();
      const counts = countStateRecords(state);
      updateCloudStateStatus(`
        <strong>Import Supabase terminÃ©.</strong><br>
        Ã‰vÃ©nements : ${counts.events} Â· PS : ${counts.ps} Â· Messages : ${counts.commandMessages} Â· Contacts : ${counts.contacts}
      `, 'success');
      input.value = '';
    } catch (error) {
      updateCloudStateStatus(`Import JSON impossible : ${esc(error.message || String(error))}`, 'warning');
    }
  });
}

function ensureSystemSettingsUI() {
  const targetGrid = document.getElementById('databaseSettingsGrid') || document.querySelector('[data-settings-panel="db"] .settings-grid');
  if (!targetGrid) return;
  let card = document.getElementById('systemCard');
  if (!card) {
    card = document.createElement('div');
    card.className = 'card';
    card.id = 'systemCard';
    targetGrid.appendChild(card);
  } else if (card.parentElement !== targetGrid) {
    targetGrid.appendChild(card);
  }
  const remoteConfig = window.SICODApi?.system?.getRemoteConfig?.() || {};
  const authState = window.SICODApi?.system?.getAuthState?.() || {};
  card.innerHTML = `
    <div class="card-header"><h2 class="card-title">Base de donnÃ©e</h2></div>
    <div class="card-body">
      <div class="grid-2">
        <div><label>Fournisseur</label><input value="Supabase" readonly></div>
        <div><label>AccÃ¨s</label><input value="${remoteConfig.enabled ? 'Authentification requise' : 'Configuration manquante'}" readonly></div>
        <div><label>URL Supabase</label><input value="${esc(remoteConfig.supabaseUrl || '')}" readonly></div>
        <div><label>Project ref</label><input value="${esc(remoteConfig.projectRef || '')}" readonly></div>
        <div><label>RÃ´le applicatif courant</label><input value="${esc(authState.role || 'lecture')}" readonly></div>
        <div><label>Table de rÃ©fÃ©rence des rÃ´les</label><input value="public.app_user_roles" readonly></div>
        <div><label>Annuaire utilisateurs</label><input value="public.app_user_directory" readonly></div>
      </div>
      <div class="cloud-admin-grid">
        <button class="fr-btn secondary" type="button" onclick="checkSupabaseState()">VÃ©rifier la connexion</button>
        <button class="fr-btn secondary" type="button" onclick="exportCurrentStateJson()">Exporter les donnÃ©es</button>
        <button class="fr-btn secondary" type="button" onclick="pushCurrentStateToSupabase()">Pousser vers Supabase</button>
        <button class="fr-btn secondary" type="button" onclick="reloadStateFromSupabase()">Recharger depuis Supabase</button>
      </div>
      <div class="field-stack">
        <label for="cloudStateImportFile">Importer un export JSON dans Supabase</label>
        <input id="cloudStateImportFile" type="file" accept="application/json,.json">
      </div>
      <div id="cloudStateStatus" class="cloud-status-panel help">Aucun controle execute pour le moment.</div>
    </div>
  `;
}

function ensureGeneralPasswordSettingsUI() {
  const generalGrid = document.querySelector('[data-settings-panel="general"] .settings-grid');
  if (!generalGrid || document.getElementById('passwordSettingsCard')) return;
  const authState = window.SICODApi?.system?.getAuthState?.() || {};
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'passwordSettingsCard';
  card.innerHTML = `
    <div class="card-header"><h2 class="card-title">AccÃ¨s Ã  l'application</h2></div>
    <div class="card-body">
      <div><label>Compte connecte</label><input value="${esc(authState.email || '')}" readonly></div>
      <div class="grid-2" style="margin-top:1rem">
        <div><label for="settingNewPassword">Nouveau mot de passe</label><input id="settingNewPassword" type="password" autocomplete="new-password"></div>
        <div><label for="settingConfirmPassword">Confirmation</label><input id="settingConfirmPassword" type="password" autocomplete="new-password"></div>
      </div>
      <p class="help">Laissez ces champs vides pour conserver le mot de passe actuel.</p>
    </div>
  `;
  generalGrid.appendChild(card);
}

function formatUserAdminRoleLabel(role) {
  if (role === 'admin') return 'Administrateur';
  if (role === 'redacteur') return 'Rédacteur';
  return 'Lecture';
}

function ensureUserAdminSettingsUI() {
  const targetGrid = document.getElementById('userAdminSettingsGrid') || document.querySelector('[data-settings-panel="users"] .settings-grid');
  if (!targetGrid) return;
  let card = document.getElementById('userAdminCard');
  if (!card) {
    card = document.createElement('div');
    card.className = 'card';
    card.id = 'userAdminCard';
    targetGrid.appendChild(card);
  }
  card.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">Administration des utilisateurs</h2>
      <div class="list-actions">
        <button class="fr-btn secondary small" type="button" onclick="loadUserAdminDirectory(true)">Actualiser</button>
      </div>
    </div>
    <div class="card-body">
      <p class="help">Un utilisateur apparaît ici après sa première connexion. Les rôles appliqués pilotent l'accès aux paramètres administrateur.</p>
      <div id="userAdminStatus" class="help">Chargement en attente.</div>
      <div id="userAdminList"></div>
    </div>
  `;
}

function updateUserAdminStatus(message, tone = 'info') {
  const mount = document.getElementById('userAdminStatus');
  if (!mount) return;
  mount.className = tone === 'warning' ? 'help auth-warning' : (tone === 'success' ? 'help auth-success' : 'help');
  mount.textContent = message;
}

function renderUserAdminDirectory() {
  const mount = document.getElementById('userAdminList');
  if (!mount) return;
  const authState = window.SICODApi?.system?.getAuthState?.() || {};
  const currentUserId = authState.userId || '';
  const items = Array.isArray(userAdminState.items) ? [...userAdminState.items] : [];
  if (!items.length) {
    mount.innerHTML = '<p class="help">Aucun utilisateur connu pour le moment.</p>';
    return;
  }
  mount.innerHTML = `
    <div class="table-wrap">
      <table class="table user-admin-table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Rôle</th>
            <th>Dernière activité</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => {
            const role = item.roles?.includes('admin')
              ? 'admin'
              : (item.roles?.includes('redacteur') ? 'redacteur' : 'lecture');
            const locked = item.userId === currentUserId;
            const options = ['admin', 'redacteur', 'lecture']
              .map((value) => `<option value="${value}" ${role === value ? 'selected' : ''}>${formatUserAdminRoleLabel(value)}</option>`)
              .join('');
            return `<tr>
              <td>
                <div class="event-title-block">
                  <span class="event-label">${esc(item.displayName || item.email || 'Utilisateur')}</span>
                  <span class="table-meta">${esc(item.email || '')}${locked ? ' · compte courant' : ''}</span>
                </div>
              </td>
              <td>
                <select id="userRole-${esc(item.userId)}" ${locked ? 'disabled' : ''}>
                  ${options}
                </select>
              </td>
              <td>${esc(item.lastSeenAt ? formatDateTimeValueFR(item.lastSeenAt) : 'Jamais')}</td>
              <td>
                <div class="list-actions">
                  <button class="fr-btn secondary small" type="button" onclick="saveManagedUserRole('${esc(item.userId)}')" ${locked ? 'disabled' : ''}>Enregistrer</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function loadUserAdminDirectory(force = false) {
  if (!isCurrentUserAdmin()) return;
  ensureUserAdminSettingsUI();
  if (userAdminState.loading) return;
  if (userAdminState.loaded && !force) {
    renderUserAdminDirectory();
    return;
  }
  userAdminState.loading = true;
  updateUserAdminStatus('Chargement des utilisateurs...', 'info');
  try {
    const users = await window.SICODApi?.system?.listManagedUsers?.();
    userAdminState.items = Array.isArray(users) ? users : [];
    userAdminState.loaded = true;
    renderUserAdminDirectory();
    updateUserAdminStatus(`${userAdminState.items.length} utilisateur(s) chargé(s).`, 'success');
  } catch (error) {
    updateUserAdminStatus(`Chargement impossible : ${error.message || String(error)}`, 'warning');
  } finally {
    userAdminState.loading = false;
  }
}

async function saveManagedUserRole(userId) {
  const targetUserId = String(userId || '').trim();
  if (!targetUserId) return;
  const select = document.getElementById(`userRole-${targetUserId}`);
  const nextRole = select?.value || '';
  if (!nextRole) {
    showToast('Sélectionnez un rôle valide.', 'error');
    return;
  }
  updateUserAdminStatus('Enregistrement du rôle utilisateur...', 'info');
  try {
    await window.SICODApi?.system?.saveManagedUserRoles?.(targetUserId, [nextRole]);
    const target = userAdminState.items.find((item) => item.userId === targetUserId);
    if (target) target.roles = [nextRole];
    renderUserAdminDirectory();
    updateUserAdminStatus('Rôle utilisateur enregistré.', 'success');
    showToast('Rôle utilisateur enregistré.');
  } catch (error) {
    updateUserAdminStatus(`Enregistrement impossible : ${error.message || String(error)}`, 'warning');
    showToast(`Rôle non modifié : ${error.message || String(error)}`, 'error');
  }
}

function ensureExportSettingsCleanupUI() {
  const htmlHelp = document.querySelector('#htmlTemplateSettingsCard .help');
  if (htmlHelp) {
    htmlHelp.textContent = "Ces maquettes HTML sont les modÃ¨les actifs des aperÃ§us et des exports PDF. Toute importation remplace immÃ©diatement le rendu en vigueur pour le document sÃ©lectionnÃ©.";
  }
}

function ensureSettingsEnhancements() {
  ensureExportSettingsUI();
  ensureSettingsNavigatorUI();
  ensureSystemSettingsUI();
  ensureGeneralPasswordSettingsUI();
  ensureUserAdminSettingsUI();
  ensureEventSignatureSettingsUI();
  ensureExportSettingsCleanupUI();
  ensureSettingsCleanupUI();
  ensureSettingsFooterActions();
  bindCloudStateImport();
}

function ensureEventSignatureSettingsUI() {
  const panel = document.querySelector('[data-settings-panel="events"] .card-body');
  if (!panel || panel.querySelector('#settingEventSignatureMode')) return;
  panel.insertAdjacentHTML('beforeend', `
    <div class="grid-3" style="margin-top:1rem">
      <div>
        <label>Signature</label>
        <select id="settingEventSignatureMode">
          <option value="prefet">Le prÃ©fet</option>
          <option value="delegation">Pour le prÃ©fet, par dÃ©lÃ©gation</option>
        </select>
      </div>
      <div>
        <label>Nom du signataire</label>
        <input id="settingEventSignatureName">
      </div>
      <div>
        <label>Fonction du signataire</label>
        <input id="settingEventSignatureRole">
      </div>
    </div>
  `);
}

function loadSettingsForm() {
  const get = id => document.getElementById(id);
  let activeTab = document.querySelector('.settings-tab.active')?.dataset.settingsTab || 'general';
  ensureSettingsEnhancements();
  if (activeTab !== 'general' && !isCurrentUserAdmin()) activeTab = 'general';
  const authState = window.SICODApi?.system?.getAuthState?.() || {};
  if (get('settingTheme')) get('settingTheme').value = state.settings.theme || 'light';
  const accountField = document.querySelector('#passwordSettingsCard input[readonly]');
  if (accountField) accountField.value = authState.email || '';
  if (get('settingNewPassword')) get('settingNewPassword').value = '';
  if (get('settingConfirmPassword')) get('settingConfirmPassword').value = '';
  if (get('settingPsFormat')) get('settingPsFormat').value = state.settings.psFormat || 'detail';
  if (get('settingClassification')) get('settingClassification').value = state.settings.classification || 'Non protÃ©gÃ©';
  if (get('settingAuthor')) get('settingAuthor').value = state.settings.author || 'SIRACEDPC';
  if (get('settingPsSignatureMode')) get('settingPsSignatureMode').value = state.settings.psSignatureMode || 'prefet';
  if (get('settingPsSignatureName')) get('settingPsSignatureName').value = state.settings.psSignatureName || '';
  if (get('settingPsSignatureRole')) get('settingPsSignatureRole').value = state.settings.psSignatureRole || '';
  if (get('settingEventTypes')) get('settingEventTypes').value = getDynamicList('eventTypes').join('\n');
  if (get('settingEventSignatureMode')) get('settingEventSignatureMode').value = state.settings.eventSignatureMode || 'delegation';
  if (get('settingEventSignatureName')) get('settingEventSignatureName').value = state.settings.eventSignatureName || '';
  if (get('settingEventSignatureRole')) get('settingEventSignatureRole').value = state.settings.eventSignatureRole || '';
  if (get('settingCommandTypes')) get('settingCommandTypes').value = getDynamicList('commandTypes').join('\n');
  if (get('settingCommandSignatureMode')) get('settingCommandSignatureMode').value = state.settings.commandSignatureMode || 'delegation';
  if (get('settingCommandSignatureName')) get('settingCommandSignatureName').value = state.settings.commandSignatureName || '';
  if (get('settingCommandSignatureRole')) get('settingCommandSignatureRole').value = state.settings.commandSignatureRole || '';
  if (get('settingCommandPhone')) get('settingCommandPhone').value = state.settings.commandPhone || '';
  if (get('settingCommandFax')) get('settingCommandFax').value = state.settings.commandFax || '';
  if (get('settingCommandEmail')) get('settingCommandEmail').value = state.settings.commandEmail || '';
  if (get('settingCommandAudioConf')) get('settingCommandAudioConf').value = state.settings.commandAudioConf || '';
  if (get('settingDirectoryGroups')) get('settingDirectoryGroups').value = getDynamicList('directoryGroups').join('\n');
  if (get('settingDirectoryEntities')) get('settingDirectoryEntities').value = getDynamicList('directoryEntities').join('\n');
  if (get('settingPlanTypes')) get('settingPlanTypes').value = getDynamicList('planTypes').join('\n');
  if (get('settingPlanRiskTypes')) get('settingPlanRiskTypes').value = getDynamicList('planRiskTypes').join('\n');
  if (get('settingPlanPriorities')) get('settingPlanPriorities').value = getDynamicList('planPriorities').join('\n');
  if (get('settingPlanStatuses')) get('settingPlanStatuses').value = getDynamicList('planStatuses').join('\n');
  if (get('settingDutyRoles')) get('settingDutyRoles').value = getDynamicList('dutyRoles').join('\n');
  if (get('settingDutySignerLastName')) get('settingDutySignerLastName').value = state.settings.dutySignerLastName || '';
  if (get('settingDutySignerFirstName')) get('settingDutySignerFirstName').value = state.settings.dutySignerFirstName || '';
  if (get('settingDutySignerFunction')) get('settingDutySignerFunction').value = state.settings.dutySignerFunction || '';
  if (get('settingDutyAgents')) get('settingDutyAgents').value = getDynamicList('dutyAgents').join('\n');
  if (get('settingReflexFamilies')) get('settingReflexFamilies').value = getDynamicList('reflexFamilies').join('\n');
  if (get('settingPlanExpiryRules')) get('settingPlanExpiryRules').value = Object.entries(state.settings.planExpiryYears || {}).map(([k, v]) => `${k} = ${v}`).join('\n');
  populateHtmlTemplateEditor();
  if (get('settingPdfPrimaryColor')) get('settingPdfPrimaryColor').value = state.settings.pdfAppearance?.primaryColor || DEFAULT_SETTINGS.pdfAppearance.primaryColor;
  if (get('settingPdfAccentColor')) get('settingPdfAccentColor').value = state.settings.pdfAppearance?.accentColor || DEFAULT_SETTINGS.pdfAppearance.accentColor;
  if (get('settingPdfTextColor')) get('settingPdfTextColor').value = state.settings.pdfAppearance?.textColor || DEFAULT_SETTINGS.pdfAppearance.textColor;
  if (get('settingPdfAlertColor')) get('settingPdfAlertColor').value = state.settings.pdfAppearance?.alertColor || DEFAULT_SETTINGS.pdfAppearance.alertColor;
  if (get('settingPdfLogoScale')) get('settingPdfLogoScale').value = String(state.settings.pdfAppearance?.logoScale || DEFAULT_SETTINGS.pdfAppearance.logoScale);
  showSettingsTab(activeTab);
  if (isCurrentUserAdmin()) loadUserAdminDirectory();
  refreshStorageStatus();
}

async function saveSettings() {
  const get = id => document.getElementById(id);
  syncHtmlTemplateEditorValue();
  const nextPassword = (get('settingNewPassword')?.value || '').trim();
  const confirmPassword = (get('settingConfirmPassword')?.value || '').trim();
  if (nextPassword || confirmPassword) {
    if (nextPassword.length < 8) {
      showSettingsTab('general');
      showToast('Le mot de passe doit contenir au moins 8 caracteres.', 'error');
      return;
    }
    if (nextPassword !== confirmPassword) {
      showSettingsTab('general');
      showToast('La confirmation du mot de passe ne correspond pas.', 'error');
      return;
    }
  }
  state.settings.theme = get('settingTheme')?.value || 'light';
  state.settings.dashboardBanner = '';
  state.settings.psFormat = get('settingPsFormat')?.value || 'detail';
  state.settings.classification = get('settingClassification')?.value || 'Non protÃ©gÃ©';
  state.settings.author = (get('settingAuthor')?.value || '').trim() || 'SIRACEDPC';
  state.settings.dutySignerLastName = (get('settingDutySignerLastName')?.value || '').trim();
  state.settings.dutySignerFirstName = (get('settingDutySignerFirstName')?.value || '').trim();
  state.settings.dutySignerFunction = (get('settingDutySignerFunction')?.value || '').trim();
  state.settings.commandSignatureMode = get('settingCommandSignatureMode')?.value || 'delegation';
  state.settings.commandSignatureName = (get('settingCommandSignatureName')?.value || '').trim();
  state.settings.commandSignatureRole = (get('settingCommandSignatureRole')?.value || '').trim();
  state.settings.commandPhone = (get('settingCommandPhone')?.value || '').trim();
  state.settings.commandFax = (get('settingCommandFax')?.value || '').trim();
  state.settings.commandEmail = (get('settingCommandEmail')?.value || '').trim();
  state.settings.commandAudioConf = (get('settingCommandAudioConf')?.value || '').trim();
  state.settings.psSignatureMode = get('settingPsSignatureMode')?.value || 'prefet';
  state.settings.psSignatureName = (get('settingPsSignatureName')?.value || '').trim();
  state.settings.psSignatureRole = (get('settingPsSignatureRole')?.value || '').trim();
  state.settings.eventSignatureMode = get('settingEventSignatureMode')?.value || 'delegation';
  state.settings.eventSignatureName = (get('settingEventSignatureName')?.value || '').trim();
  state.settings.eventSignatureRole = (get('settingEventSignatureRole')?.value || '').trim();
  state.settings.pdfAppearance = {
    primaryColor: get('settingPdfPrimaryColor')?.value || DEFAULT_SETTINGS.pdfAppearance.primaryColor,
    accentColor: get('settingPdfAccentColor')?.value || DEFAULT_SETTINGS.pdfAppearance.accentColor,
    textColor: get('settingPdfTextColor')?.value || DEFAULT_SETTINGS.pdfAppearance.textColor,
    alertColor: get('settingPdfAlertColor')?.value || DEFAULT_SETTINGS.pdfAppearance.alertColor,
    logoScale: Number(get('settingPdfLogoScale')?.value || DEFAULT_SETTINGS.pdfAppearance.logoScale)
  };
  state.settings.remoteSync = Object.assign({}, window.SICODApi?.system?.getRemoteConfig?.() || DEFAULT_SETTINGS.remoteSync);
  refreshAuthGate();


  const parseList = id => (get(id)?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (get('settingEventTypes')) window.SICODDataModel?.setReferenceLabels(state, 'eventTypes', parseList('settingEventTypes'));
  if (get('settingCommandTypes')) window.SICODDataModel?.setReferenceLabels(state, 'commandTypes', parseList('settingCommandTypes'));
  window.SICODDataModel?.setReferenceLabels(state, 'directoryGroups', parseList('settingDirectoryGroups'));
  if (get('settingDirectoryEntities')) window.SICODDataModel?.setReferenceLabels(state, 'directoryEntities', parseList('settingDirectoryEntities'));
  window.SICODDataModel?.setReferenceLabels(state, 'planTypes', parseList('settingPlanTypes'));
  if (get('settingPlanRiskTypes')) window.SICODDataModel?.setReferenceLabels(state, 'planRiskTypes', parseList('settingPlanRiskTypes'));
  window.SICODDataModel?.setReferenceLabels(state, 'planPriorities', parseList('settingPlanPriorities'));
  window.SICODDataModel?.setReferenceLabels(state, 'planStatuses', parseList('settingPlanStatuses'));
  window.SICODDataModel?.setReferenceLabels(state, 'dutyRoles', parseList('settingDutyRoles'));
  window.SICODDataModel?.setReferenceLabels(state, 'dutyAgents', parseList('settingDutyAgents'));
  window.SICODDataModel?.setReferenceLabels(state, 'reflexFamilies', parseList('settingReflexFamilies'));
  if (get('settingPlanExpiryRules')) {
    const rules = {};
    parseList('settingPlanExpiryRules').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = Number(parts.slice(1).join('=').trim());
        if (key && Number.isFinite(value) && value > 0) rules[key] = value;
      }
    });
    state.settings.planExpiryYears = rules;
  }

  if (nextPassword) {
    try {
      await window.SICODApi?.auth?.updatePassword?.(nextPassword);
      if (get('settingNewPassword')) get('settingNewPassword').value = '';
      if (get('settingConfirmPassword')) get('settingConfirmPassword').value = '';
    } catch (error) {
      showSettingsTab('general');
      showToast(`Mot de passe non modifie : ${error.message || String(error)}`, 'error');
      return;
    }
  }

  await pushReferenceCatalogToSupabase();
  persist();
  applyTheme(state.settings.theme);
  applySidebarState();
  applyBrandAssets();
  renderDirectory();
  renderPlanning();
  renderDutyCalendar();
  renderDutyAvailabilityList();
  renderDutySchedule();
  renderPlanningStats();
  renderDutyStats();
  loadSettingsForm();
  showToast('ParamÃ¨tres enregistrÃ©s.');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 19. BOOTSTRAP â€” Initialisation, renderAll, intervalles
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderAll() {
  if (isAuthLocked()) {
    const appLayout = document.getElementById('appLayout');
    if (appLayout) appLayout.hidden = true;
    refreshAuthGate();
    refreshStorageStatus();
    return;
  }
  renderEvents();
  renderEventArchives();
  renderPSList();
  renderDashboard();
  renderFiches();
  renderCommandList();
  if (state.selectedCommandId && byId(getActiveItems(state.commandMessages), state.selectedCommandId)) {
    renderCommandPreview(byId(state.commandMessages, state.selectedCommandId));
  } else {
    renderCommandPreview(null);
  }
  renderDirectory();
  renderTools();
  renderPlanning();
  renderDutyCalendar();
  renderDutyAvailabilityList();
  renderDutySchedule();
  loadSettingsForm();
  bindPSMediaInputs();
  applyBrandAssets();
  refreshDashboardBanner();
  const appLayout = document.getElementById('appLayout');
  if (appLayout) appLayout.hidden = false;
  refreshAuthGate();
}

// Initialisation
applyTheme(state.settings.theme);

const dutyMonthEl = document.getElementById('dutyMonth');
if (dutyMonthEl && !dutyMonthEl.value) dutyMonthEl.value = todayISO().slice(0, 7);

initCommandForm();
renderAll();
ensureAuthGateUI();
refreshAuthGate();
window.SICODApi?.auth?.restoreSession?.()
  .then(() => {
    refreshAuthGate();
  
    return Promise.all([
      window.SICODApi?.system?.hydrateState?.(),
      hydrateReferenceCatalogFromSupabase()
    ]);
  })
  .then(async ([remoteState]) => {
    if (remoteState && typeof remoteState === 'object') {
      applyRemoteStateSnapshot(remoteState);
      await hydrateReferenceCatalogFromSupabase();
      renderAll();
    } else {
      refreshStorageStatus();
      persist();
      renderAll();
    }
  })
  .catch((error) => {
    console.warn('[Remote] Hydratation distante indisponible :', error.message);
    refreshStorageStatus();
  })
  .finally(() => {
    refreshAuthGate();
  
  });

// Mise Ã  jour horloge chaque seconde (heure locale)
setInterval(() => {
  const el = document.getElementById('kpiTime');
  if (el) el.textContent = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}, 1000);


function editSelectedPS(){
 if(!state.selectedPSId){showToast('SÃ©lectionnez un point de situation','error');return;}
 openPSForm(state.selectedPSId);
}
function deleteSelectedPS(){
 deletePS(state.selectedPSId);
}


