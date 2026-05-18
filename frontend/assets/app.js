function formatPSDateTime(ps){
  const date = ps && ps.date ? String(ps.date) : '';
  const time = ps && ps.time ? String(ps.time) : '';
  return [date, time].filter(Boolean).join(' ') || '—';
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

// ============================================================
// SICOD — Script principal consolidé
// Version : refactorée — aucune fonctionnalité supprimée
// Charte graphique : conservée intégralement
//
// ARCHITECTURE :
//   1. Constantes de données (logoBase64, reflexLibrary, commandTypes)
//   2. Couche Storage (isolée — synchronisation Supabase)
//   3. État applicatif (state) — unique, initialisé une seule fois
//   4. Utilitaires globaux
//   5. Modules par page (Dashboard, Événements, PS, Command, Fiches,
//      Annuaire, Outils, Planning, Astreintes, Paramètres)
//   6. Bootstrap (init, renderAll, intervalles)
//
// CIBLE ACTUELLE — points documentés :
//   [SB-STORAGE] : synchronisation vers Supabase
//   [SB-AUTH]    : authentification utilisateur via Supabase Auth
//   [GH-PAGES]   : publication du frontend statique via GitHub Pages
// ============================================================

'use strict';

// ────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTES DE DONNÉES
// ────────────────────────────────────────────────────────────────────────────
const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAggAAABaCAIAAABSRznhAAAQKUlEQVR4nO3df0wT5x8H8GsLtPJTQUEnAhZ0cYhV6Bg4cNNhgKkoRnRTmW4zhqngj5kNcUQTWQrEFYmEzUWjzl9zMJGoCFMIgajohqyCX0SLFkUNKoMJFEqBfv+4fO97V6C9QhFK36+/+tw9z3PP84neh95zveNoNBoCAADgf7jDPQAAABhZkBgAAIABiQEAABiQGAAAgAGJAQAAGJAYAACAAYkBAAAYkBgAAIABiQEAABiQGAAAgAGJAQAAGJAYAACAAYkBAAAYkBgAAIABiWHILV++nMPhcLnclJSU4R4LAIB+FsM9gFFu//79OTk5FhYWR44c+eyzz4Z7OAAA+nHwop6hU1paumDBAj6fn52dHRYWNtzDAQBgRU9i4HhlGtSdvCDUoPrjlkQbVJ8gCMf/XDe0CQAAsGf8NQZPQxj96H0Si8WcvtjZ2U2bNu3TTz/Nzc3tnSD7bGVlZeXo6CgWi+Pi4v7++2/2x6I7duzYgOsPrAmlsLAwNjbW19fXxcXFysrK1tbWy8srMjIyMzPz1atXZB0PDw+9/dMVFxdrjar316OysjJ6k/z8/DcfagBgyawXn1tbW+Vy+a+//rps2bIFCxY0NTXpbaJWq5uamsrLyw8ePOjr65uUlPQGxmkUMplMLBaHhIRkZGRUVFS8ePFCrVa3tbXV1taeP39+8+bNrq6uzc3Nwz3M/zPdUAOYOrNODHTFxcXLly83qIlGo0lMTCwpKRmiIRlRbm5uYGBgeXm5jjoqlaqrq+uNDckgJhRqgFHA7BJDaGioRqPRaDStra1XrlwRCoXUruLi4qKiIh2turu7nzx5EhcXR9918uRJvcfSsn79eqPUZ9mkoqJi9erV7e3tZJHD4axfv/7GjRuvX79ubW2trKyUSCSTJk2i6isUCnpXWl+k0tLStI714Ycf9je8AXgzoQYAHcwuMVBsbGxCQkIOHTpE30heLu8Pl8t1dXVNS0tzdXWlNsrl8iEaobFs3bpVqVRSxcOHDx89ejQgIMDOzs7GxmbmzJnx8fG1tbVfffUVh8MZxnHSmWioAUYH800MJB8fH3qRWoDVgcvluru7U0Vra2vjD8t4bt26VVpaShVXrVr1xRdf9K42ZsyYzMxMJyenNzg0/Uwr1ACjhrknhsrKSnpx/Pjxepv09PQoFAqqOHPmTKOPyoguX75ML2pdnBnhTCvUAKOG+SYGpVJZWFgYExND36j7cnlPT099ff327dufPn1KbuHz+Zs2beqvfkFBQe8bKHXkHkPrs2ly584d6jOfz3/33Xd19DZyDHWoAUAHs3skBnkG6XPXvHnzFixYwL7V2LFjs7Ky3NzcjDxEo3r58iX1efz48ZaWlsM4GDZMN9QAo4bZJYb+BAUFnTt3jn39t99+Oz8/38PDY8hGZHwjZ23ZIKYYagCTZr6XkgiCsLa2FgqFK1eu/P3330tKSgxaeq2pqQkODn7w4IGOOn3eQ6ljfdvQ+myaTJgwgfr88uXLofulgkFZx6DKQxFqANDB7BID/QxC/u737Nmz5JOx9bZqamr68ccfqasx9fX1UVFR3d3db2TgAzRr1izqs0qlunXr1hAdiH7LUGdnp9ZelUpFL9ra2vbXj+mGGmDUMLvEMBhjx46NiYmRSCTUFplMdvjw4WEckl7h4eH0YkZGxhAdyMXFhfr85MkTrb2PHz+mF52dnXX3ZoqhBhg1kBgMFhsbS7+5XiKRjNgnSRAE4e/vHxwcTBXPnDnzyy+/9K7W3t6+efPmxsbGAR/ovffeoz7L5fL79+/T9168eJH67Ojo6OXlxaZP0wo1wKiBxGAwKyurHTt2UMW6urozZ84M43j0Sk9Pp1/nWb9+/YYNG27evNnW1qZUKquqqlJSUjw9PTMzMzWDeDlHVFQU/ZaniIiI4uLilpaWR48eJSQkZGVlUbtWr17Nco3B5EINMDogMQzEhg0b6CvVqampfZ5S+7y5nsPhrF271lgjYXOIOXPmnD59WiAQkEWNRnPkyJGAgABbW1sbGxsfH5/4+Pjnz58PciRubm47d+6kijU1NfPnz7e3txcKhRKJhIqPi4tLQkIC+25HTqgBzAcSw0BYW1vHxsZSxaqqqkuXLg3jePRaunRpWVmZr6+vjjp8Pt/CYlC3LyclJW3fvl1HBS8vr4KCAvoD+/QyuVADjAJIDAO0ZcsWGxsbqpicnDyMg2FDJBKVl5dfuXJl8+bNIpFo/PjxFhYW5A27y5Yty8jIqK+vHzt27GAOweVypVJpZWXltm3bxGKxo6OjhYWFjY2Nu7t7ZGTk0aNHKysrRSKRod2aXKgBTJ3xX+1p0HvZ/nlnrkH9E3i1JwDAEMM3BgAAYEBiAAAABiQGAABgQGIAAAAGJAYYhWprazds2BATE/P69evhHguA6UFigNGmtbU1IyMjISEhOjpaKpX29PQM94gATAzexwCjja2tbVpaGkEQQqHw/fffH+7hAJie0Z8YTpw4Qb6Bh8PhjBkzxtnZ2dvb++OPP37rrbd616HbtGnTwoUL1Wp1bm5uSUnJy5cvbWxspk+fvnjx4nfeeUfHgQiCsLKymjhxYnh4eFhYGFWhu7s7Ly+vqKjo2bNnPB7Pw8Nj0aJF9DNXUlJSc3Pz/v376d1u37590qRJ33zzDVnUaDRXr14tKiqqq6vTaDQTJ0708/NbvHgx+du0EydO5OXlaT1QKDU19fnz5+S50igzZRlVNtPpL4D29vZubm5RUVH0x4brnR2bIJNHEYlEe/fupTZKJJK2trakpCTdIeozFP3p6ur6888/CwsLKyoqZsyYQXauNVMejzdhwoSgoKAVK1bw+XyD+gcYOqM/MRAEIRAIyLOJUqmsq6vLzc3dtm3btm3b5s6d27uOloMHD8pksri4OG9vb5VKVVNTc/r06T179vT5jkyqk46OjtLS0szMTEtLy48++oggiO7u7u+///7Ro0cbN26cM2dOV1dXaWlpenq6XC5ft24dy4n09PSkpqbeu3dv3bp1fn5+fD6/pqbm+PHjDQ0NX3/9taHRGMxMCXZRNRTVZ2Nj47Fjx5KSkqRSqaurK8vmLIPM4XBkMlllZaWPj4/uYQzGrVu3SktLw8LCurq6tB4KGx0dHR0dTRCEWq2urq7+4YcfXrx4oftpIgBvknmtMVhbW8+YMSM+Pj4gIODgwYNsViZv3LgREhLi5+cnEAgcHBz8/f2TkpL0vjlZIBAsXLjQ09OzrKyM3HLhwoWKiopdu3YFBgYKBAJbW9vw8PAvv/zy/PnzMpmM5fgvXrz4119/7dmzh3w+HZ/PnzVrVnJysre3N8sedBjYTIkBRVUvJyendevWqdXqiooK9q1YBtnBwWH27NknT54c/Dh1mDt37rfffisWi7ncfv+XWVpazpo1a9GiRdevX8cTxWHkMK/EQFmxYkVHR8e1a9f01nRycqqurm5raxvYgagnjuTn54tEounTp9P3hoSEjBs3Lj8/n2VveXl5vr6+U6dOpW+0tLSkX7AasEHOlDAkquyp1Wr2ldkHee3atffv3x+699kZhMfjDeaB5wBGZ6aJYcqUKXw+X6FQ6K0ZExPz7Nmzzz///Lvvvjt27Njdu3fZ9N/R0VFYWPjw4cP58+cTBNHS0tLQ0ND7KVI8Hs/d3V3324wpZCdaZz0jGthM6dhHVa9//vnn+PHjfD4/MDCQZRODguzp6RkYGHjq1KnhPSN3dXVVV1fn5eUtXbp0kI+2BTAiM/23SC6ZKpVKaktHR0dkZCS9TkZGxuTJk2fPnn3o0KGqqqp79+5VVVXl5uaKxeL4+Hgej9e7W61OwsPDyfMa+Wd4n88uHTdu3L1799iMmeyE/pzRPvWeCEEQHh4eOioMYKZ96h1VQ9HHZm1tvW/fPq1ndOuYnaFBXrNmTVxcXElJyQcffKBjGCQyRFrVrly5kpmZ2ecuNlauXEl+H/L394+KihpADwBDxEwTg0ajUSqV9JOsjvVGPp/v5+fn5+dHEERJSUlaWlp+fv6iRYt616Q6UavVjx49OnDggFQq3blzJ3mg5ubm3k2ampqoYXA4fT/slnzfGVlN76We3hMh79sZzExlMhl1D4+/v/+uXbv6bK4VVd3T6bNPcmw9PT0KhSIlJeXs2bO7d++mv+5Nx+xYBpkyefLk+fPnnzlzJigoSGuXURaf9frtt9/UarVCofjpp592796dmprKPgcDDCkzvZT0+PHjzs5OrYv1bMybN8/BwUHvxR9LS8vp06dHRERcu3atoaHBzs7O2dm5trZWq1p3d3ddXd20adPIokAgaGlp0arz77//ki9fs7Ozc3Fx0XqX8tChz1QkEuX8T39ZgegVVd3T0dEnl8sVCoVbtmwpLy+/fp3tU9ZZBplu1apVjY2Nf/zxB8tDaFm4cGFOTs7Avi6QLC0tp02btnHjxocPH1ZVVQ24HwDjMtPEkJ2dLRAI2NxYqfWXY2dnp1KpHDNmDJujkH8vd3d3EwQRFhYmk8nkcjm9QlFRUVNTU2hoKFkUCoWNjY2NjY1UhYaGhubmZqFQSBbDw8Nv376tdRFfrVazX77WYTAzJWlFVe90dPPx8fH29s7OzmY/ADZBppswYUJoaGhWVpZKpWJ/FKPD/Ugw0phXYmhvb6+urk5JSbl58+bWrVvt7Oz0NsnJydm3b59cLler1U+fPk1LS+vp6SF/mqBDV1fXgwcPLly4MHXqVPIqeUREhEgkkkgkZWVlKpWqtbW1oKDg8OHDERERs2fPJluFhIQ4ODikp6c/fvxYpVIpFIr09HQnJydyBZsgiCVLlvj6+u7du7e4uLilpaWzs/POnTvx8fEDWCg21kyJ/qOqdzp6RUZGKhSK27dvs6zPJshaoqKi2tvb79y5w/IQRiGVSsvLy1+/ft3R0XH37t2ff/55ypQpRrnnGMAozGKNgVxL5HA4AoHA2dl55syZBw4coP9Gl+hrvXHFihVr1qxJTk7Oz8+XSqWvXr2yt7f39PSUSCReXl46DkQQBI/Hc3R09PX1/eSTT8hL5DweLzEx8dKlS2fPnpVKpeSPcrds2RIcHEw1t7Ozk0gkp06dSkxMbG1ttbe3F4lEO3bssLa2Jitwudz4+PirV69evnz50KFDBEG4uLiIxeI+Fzx0R2OQM2UTVb3T0cvPz8/d3f3cuXO631ZNYRNkLQ4ODkuWLMnKyuo9NfoWMkQsh016/vz5pk2bqCLZIblSvXz58uzs7IyMjI6ODicnp4CAANyVBCMKXu0JAAAM5nUpCQAA9EJiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgMP67QXq/dFeHcUY/PAAADI6eF/UAAIC5waUkAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAIb/AoVykzuG5rK2AAAAAElFTkSuQmCC";
const reflexLibrary = {"fiches": [{"code": "2.A", "title": "Feux de forêt", "family": "Risques naturels", "sections": [{"heading": "Synthèse", "items": ["Evénement concerné", "Feu de forêt impliquant la mise en œuvre de moyens de secours importants avec enjeux humains et/ou économiques (infrastructures)."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM", "Evaluation : où - quand - quoi - moyens- enjeux ? cf. verso"]}, {"heading": "Déclenchement", "items": ["Décision du PREFET"]}, {"heading": "Direction des opérations", "items": ["Activation d’une cellule de suivi ou du COD sur décision de l'autorité préfectorale."]}, {"heading": "Premières questions à poser à l’appel du CODIS ou du COSSIM", "items": ["Où et quand, précisément, le FEU DE FORET s’est-il produit ?", "Quelles sont à ce stade, vos difficultés ?", "Qui est le COS ? (commandant des opérations de secours)", "Quelle est l’autorité de police ou de gendarmerie avec laquelle vous êtes en contact ?", "Y-a-t-il des victimes ?", "Si oui, combien et identité des victimes ?", "Ces victimes sont-elles sur le terrain ?", "Un PMA (Poste médical avancé) a-t-il été mis en place ?", "Le procureur a –t-il été averti ?", "Y-a-t-il des habitations menacées ?", "Si oui, - quel est le village menacé et dans quel délai ?", "quelles sont les mesures prises ? qui avez-vous alerté ? (le maire, le député, le CD13, la GGD,...)", "l’évacuation des habitations doit-elle être envisagée ?", "quelles sont les solutions d’hébergement provisoire déjà à l’étude ?", "Quels sont les moyens engagés (terrestres, aériens) ?", "Avez-vous demandé des renforcements au BMPM ou au SDIS ?", "Si oui lesquels ? Les avez-vous obtenus ? dans quels délais ?", "Avez-vous demandé des renforcements extra-départementaux à l’EMIZDS?", "Si oui lesquels ? (colonnes de renfort, moyens aériens BASC)", "Les avez-vous obtenus ? dans quels délais ?", "A ce stade, avez-vous prévenu la presse ?", "Quelle est l’évolution probable de la situation (météorologie, …) ?"]}, {"heading": "Sur le terrain", "items": ["L’autorité préfectorale s’adresse au COS :", "Quelle est la stratégie de lutte contre le feu de forêt mise en œuvre ?", "Comment avez-vous sectorisé votre dispositif ?", "Comment avez-vous organisé votre PC, vos relèves (commandement, groupes d’intervention, …..) ?", "Envisagez-vous un déplacement de votre PC ? si oui, quand ?", "Où sont fixés (sur le terrain et sur la carte) les points de transit pour l’accueil des colonnes de renfort ?", "Quels sont les élus présents sur le terrain ?", "Où les regroupez-vous dans votre PC pour les tenir informés ?", "Un 1er briefing, à leur intention, a-t-il déjà été fait ?", "Quels sont les organes de presse présents ?", "Où est la zone presse ?", "Un point presse a-t-il déjà été fait ? si oui, par qui ?", "- Quelles sont les informations communiquées à ce stade ?"]}, {"heading": "Modalités d’alerte", "items": ["ALERTE DES SERVICES :", "Astreinte SIRACEDPC (mise en place structure suivi d’événement ou gestion de crise)", "CODIS/COSSIM (pour convocation officier de liaison à la Préfecture)", "DDTM (dispositif forestier de surveillance des massifs et coordination routière)", "Services du cabinet du préfet de police délégué", "COG (groupement de gendarmerie 13) / DIPN (CIC : centre d’information et de commandement)", "EMIZDS (information ouverture de la cellule de suivi ou du COD)", "Sous-préfet d’arrondissement (liaison maire(s) concerné(s))", "Communication préfecture", "SINSIC.", "Selon les enjeux :", "Autoroutes :", "Sur tronçon non concédé : CIGT / Services du cabinet du préfet de police délégué (C.R.S /Gendarmerie) / CRICR", "Sur tronçon concédé : Société d’Autoroute (ESCOTA, ASF) / Services du cabinet du préfet de police délégué (C.R.S /Gendarmerie) / CRICR", "Voies ferrées : EIC PACA (GPMM et RDT 13 sont également gestionnaires de réseaux)", "Ligne HT 400 kV et 225 kV :", "Considérer la ligne comme stratégique avec un enjeu supérieur à celui « feu de forêt»", "En liaison avec l’EMIZDS, prendre contact avec RTE pour connaître :", "l’impact de la coupure (nombre d’abonnés, sites particuliers, …)", "le délai nécessaire à la coupure et celui correspondant au rétablissement", "Les départements concernés devront être informés de l’éventualité de la coupure de la ligne HT"]}]}, {"code": "2.B", "title": "Vigilance Météo APIC", "family": "Risques naturels", "sections": [{"heading": "Synthèse", "items": ["Evénement concerné", "Précipitations intenses et très intenses."]}, {"heading": "Alerte initiale", "items": ["Outil d’avertissement complémentaire aux vigilances météorologiques et crues.", "Information des maires abonnées au service et de la préfecture sur les précipitations intenses ou très intenses détectées dans les communes ou à proximité immédiate (bassin Amont)."]}, {"heading": "Déclenchement", "items": ["L’outil APIC :", "Météo-France a développé un service d’« Avertissement Pluies Intenses pour les Communes », informant les maires des précipitations intenses ou très intenses détectées sur leur commune ou à proximité immédiate.", "Service complémentaire de la vigilance météorologique et de la vigilance crue, APIC est un service gratuit d’avertissement aux communes, il suffit de s’abonner sur le site internet https://apic.meteo.fr", "Conditionné à la disponibilité d’informations reçues de radars météorologiques, qualifiant l’intensité des précipitations (2 niveaux), il permet d’anticiper l’inondation par ruissellement ou crue rapide.", "Toutes les communes des Bouches du Rhône y sont éligibles et l’abonnement APIC permet d’accéder aux avertissements de communes voisines (de 1à10) notamment celles situées en amont."]}, {"heading": "APIC et gestion de crise", "items": ["Accessible aux SDIS et aux préfectures, le SIRACEDPC 13 a créé un compte APIC pour recevoir les avertissements concernant le département des Bouches du Rhône et consulter le site."]}, {"heading": "Réception des avertissements", "items": ["L’appel vocal n’a pas été sélectionné, en conséquence, les avertissements sont envoyés par", "SMS / sur les portables d’astreinte SIRACEDPC aux n° : 06.14.88.88.87 et 06.09.73.86.57", "MEL / sur les adresses génériques : pref-siracedpc@bouches-du-rhone.gouv.fr et pccrise-13@bouches-du-rhone.pref.gouv.fr"]}, {"heading": "Consultation du site", "items": ["On accède au site, exclusivement réservé aux mairies, aux préfectures , aux services de prévision des crues et à Météo-France par l’adresse : https://apic.meteo.fr", "A l’ouverture, cliquer sur « se connecter en tant que préfecture »", "Choisir le département BdR dans le menu déroulant le mot de passe est 3jthoi3e / valider", "Accès à la page d’accueil comportant :", "L’affichage des paramètres de l’abonnement et des moyens de réception", "les onglets « cartographie » et « communes abonnées »", "La cartographie, actualisée de ¼ d’heure en ¼ d’heure, indique :", "en violet les communes subissant des précipitations intenses = niveau1", "en fuschia les communes subissant des précipitations très intenses = niveau 2", "Dans le menu communes abonnées, on trouve la liste des abonnements principaux et celle des communes surveillées, au titre de l’abonnement principal.", "Si un avertissement APIC est en cours, la commune est signalée par un téléphone"]}]}, {"code": "2.C", "title": "Vigilance crue", "family": "Risques naturels", "sections": [{"heading": "Événement concerné", "items": ["Crues suite à phénomène météorologique."]}, {"heading": "Alerte initiale", "items": ["Le département des Bouches-du-Rhône comporte 4 cours d’eau majeurs surveillés par 2 SPC (service de prévision des crues).", "Le niveau de vigilance/alerte est diffusé et consultable sur : www.vigicrues.ecologie.gouv.fr"]}, {"heading": "Déclenchement", "items": ["Prévisions de SPC Grand Delta et SPC Méditerranée Est"]}, {"heading": "Modalités d’alerte", "items": ["ETAT DE VIGILANCE VERT", "Pas d’action particulière requise", "ETAT DE VIGILANCE JAUNE", "Risque de crue ou de montée rapide des eaux n'entraînant pas de dommages significatifs, mais pouvant nécessiter une vigilance particulière dans le cas d'activités saisonnières et/ou exposées. Le CODIS et le COSSIM informe les maires et les services.", "Affiner si nécessaire les prévisions avec le SPC concerné ;", "Rester en contact avec le CODIS et le COSSIM.", "ETAT DE VIGILANCE ORANGE", "Risque de crue génératrice de débordements importants susceptibles d’avoir un impact significatif sur la vie collective et la sécurité. Si l’analyse des bulletins d’informations locaux confirme la nécessité d’une action des pouvoirs publics, la préfecture procèdera à l’alerte de l’ensemble des services opérationnels, et des maires si nécessaires : ouverture d’une cellule de suivi en préfecture.", "Affiner les prévisions avec le SPC concerné et Météo-France (CMIR) ;", "Activation si nécessaire par l’astreinte SIRACEDPC d’une cellule de suivi d’événement en préfecture : SIRACEDPC – services de secours – Communication Préfecture ;", "Avertir le service communication de la préfecture qui prend contact avec les médias locaux et prépare éventuellement un communiqué de presse ;", "Informer, le cas échéant, les maires par fax et/ou SMS (Easylink) ;", "Rester en contact avec le CODIS et le COSSIM.", "ETAT DE VIGILANCE ROUGE", "Risque de crue majeure. Menace directe et généralisée de la sécurité des personnes et des biens. Elle justifie la mobilisation immédiate de l'ensemble des acteurs et des moyens au niveau du département.", "Activation du COD par l’astreinte SIRACEDPC et consolidation des prévisions météorologiques et de crues ;", "Avertir le service communication de la préfecture qui prend contact avec les médias locaux et prépare un communiqué de presse ;", "Informer les maires par fax et/ou SMS (Easylink) ;", "Anticiper les demandes de renforts selon besoins auprès de l’EMIZDS."]}]}, {"code": "2.D", "title": "Inondations", "family": "Risques naturels", "sections": [{"heading": "Événement concerné", "items": ["Inondations suite à phénomène météorologique."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM"]}, {"heading": "Déclenchement", "items": ["Décision du préfet."]}, {"heading": "Modalités d’alerte", "items": ["En complément du dispositif de vigilance crues (cf.Vigilance crue), approuvé dans le cadre du règlement de surveillance, de prévision et de transmission de l’information sur les crues (RIC), les objectifs des dispositions spécifiques ORSEC Inondations sont de :", "Définir les missions des différents services appelés à participer à la gestion des inondations et de leurs conséquences ;", "Arrêter un schéma de coordination des services intervenants, notamment au travers de la mise en place d’une cellule de crise.", "Dans le cas où une cellule de suivi d’événement ne soit pas déjà activée en préfecture , auquel cas les services essentiels à la gestion de crise seront déjà alertés :", "Mise en alerte des services (hors services de secours) :", "Astreinte SIRACEDPC pour gréement du COD ;", "Services du cabinet du préfet de police délégué ;", "CORG (groupement de gendarmerie 13) ;", "CIC (Direction départementale de la sécurité publique) ;", "DDTM (police de l’eau et coordination des gestionnaires routiers) ;", "Conseil Général (PC sûreté) ;", "ARS /APHM /SAMU ;", "DREAL ;", "Sous-préfet(s) d’arrondissement(s) concerné(s) ;", "Communication préfecture ;", "SINSIC ;", "COZ (information)."]}]}, {"code": "2.E", "title": "Évacuation des campings en zone de submersion rapide", "family": "Risques naturels", "sections": [{"heading": "Événement concerné", "items": ["Vigilance crues sur cours d'eau, de niveau ORANGE ou ROUGE.", "Épisodes météorologiques : vigilance météo Orage et/ou Pluies-Inondations, de niveau ORANGE ou ROUGE ."]}, {"heading": "Alerte initiale", "items": ["Pour les cours d’eau : messages vigilance crues émanant des SPC Grand Delta et Méditerranée Est ;", "Pour la météo : bulletins de suivi vigilance pour le département 13 ou bulletins spéciaux zone de défense (SPZEF)."]}, {"heading": "Déclenchement", "items": ["Décision du préfet", "en lien avec le(s) maire(s) concerné(s)"]}, {"heading": "Modalités d’alerte", "items": ["Alerte préfecture – mobilisation des astreintes :", "Astreinte SIRACEDPC pour gréement du COD ou de la cellule de suivi ;", "Services du cabinet du préfet de police délégué ;", "Astreinte Communication."]}, {"heading": "2 niveaux :", "items": ["Niveau ORANGE, relayé par le SIRACEDPC avec réunion éventuelle d’une cellule de suivi en préfecture ;", "Niveau ROUGE, relayé par le SIRACEDPC avec réunion systématique d’un COD en préfecture."]}, {"heading": "Structures :", "items": ["Cellule de suivi : PPOL, SDIS, BMPM, DDTM / par liaison téléphonique : Météo-France, SPC Grand Delta et/ou SPC Med-Est ;", "COD : PPOL, DIPN, GGD, CRS, ARS, DREAL, DDTM, CD 13, SDIS, BMPM, DMD, SAMU / par liaison téléphonique : VNF, Météo-France, SPC Grand Delta et/ou SPC Med-Est."]}, {"heading": "Procédure spécifique « Campings »", "items": ["(instruction du gouvernement du 06 octobre 2014 NOR : DEVP149070J)", "En cas de vigilance ORANGE : point téléphonique sur la situation locale avec le(s) maire(s) concerné(s) pour évaluation de la nécessité d’évacuer les campings en zone de submersion rapide.", "Les remontées d’information seront centralisées par la DDTM (RDI) pour proposition éventuelle d’évacuation, en prenant en compte les mesures de précaution qui auraient déjà été prises par un ou plusieurs maire.", "En cas de vigilance ROUGE : le préfet donne les consignes d’évacuation systématique pour tous les campings concernés.", "Diffusion du message ad hoc (cf. modèle en pièce jointe).", "Observation : Lorsqu’il est procédé à l’évacuation d’un ou plusieurs campings, le(s) maire(s) concerné(s) devra (ont) activer leur PCS."]}]}, {"code": "2.F", "title": "Canicule", "family": "Risques naturels", "sections": [{"heading": "Événement concerné", "items": ["Déclenchement d’un niveau d’alerte du plan canicule (4 niveaux )"]}, {"heading": "Alerte initiale", "items": ["Des épisodes aigus de pollution de l’air à l’ozone peuvent survenir à l’occasion de forte canicule."]}, {"heading": "Déclenchement", "items": ["Niveau 1 – Veille saisonnière", "Niveau 2 – Avertissement chaleur", "Niveau 3 – Alerte canicule", "Niveau 4 – Mobilisation maximale"]}, {"heading": "Conditions d’activation", "items": ["Du 1er juin au 15 septembre de chaque année, activation d’une veille saisonnière sur l’évolution climatique et sanitaire ;", "L’ARS PACA prépare et met en œuvre la communication préventive au plan local."]}, {"heading": "Niveau 2 : Avertissement chaleur", "items": ["Phase de veille renforcée", "Une information factuelle des maires par le préfet (SIRACEDPC) sur la base du bulletin spécial de Météo France,", "- des actions de communication préparées par l’ARS et coordonnées avec le service communication de la préfecture de région et de département,"]}, {"heading": "Conditions de déclenchement", "items": ["Le Préfet, au regard de l’expertise de l’ARS, décide du passage du département en niveau 3 « alerte canicule ».", "Le SIRACEDPC envoie l’alerte aux services concernés.", "Une cellule de suivi est activée à la préfecture avec des remontées d’information quotidiennes auprès du COZ."]}, {"heading": "Composition de la cellule de suivie :", "items": ["Préfecture – SIRACEDPC/SRCI", "Services du cabinet du préfet de police délégué", "Agence régionale de santé PACA (coordination de l’organisation sanitaire et médico-sociale conformément aux dispositions du volet ORSAN-CLIM)", "Météo-France", "SDIS 13", "BMPM", "DIRECCTE", "DDDCS", "DDPP", "DDTM", "Conseil départemental", "Métropole Aix Marseille Provence", "Mairie de Marseille", "DASEN (en période scolaire)"]}, {"heading": "Mesures éventuelles :", "items": ["Interdiction de manifestations festives, sportives….", "Actions de communication préventive.", "Le préfet peut mettre en place certaines des mesures départementales."]}, {"heading": "Conditions de déclenchement", "items": ["Le Premier Ministre peut demander au préfet d’activer le niveau de mobilisation maximale.", "Le préfet peut également proposer d’activer le niveau de mobilisation maximale en fonction de l’expertise de l’ARS, des données météorologiques et de la constatation d’effets collatéraux (sécheresse, pannes ou délestages électriques, saturation des hôpitaux, pollution de l’air, …)", "Dès le déclenchement du niveau 4 « mobilisation maximale », le préfet :", "Alerte les services selon les mêmes modalités que pour le niveau 3 « alerte canicule » ;", "Active le COD ;", "Met en œuvre les éléments du dispositif ORSEC pour traiter les différents aspects de la situation.", "Dans ce cadre le COD :", "Se tient informer de la situation sur le terrain ;", "Propose au préfet les mesures nécessaires en vue d’assurer la protection des populations, des biens et de l’environnement ;", "Prépare les éventuelles réquisitions de moyens publics ou privés ;", "Prépare et transmet les éventuelles demandes au COZ en matière de renforts extérieurs ;", "Dirige et coordonne l’action de ces renforts ;", "Rends compte aux échelons supérieurs (COZ et COGIC) ;", "Fourni à la cellule communication les renseignements nécessaires à l’information des médias.", "Point particulier :", "Le COD peut solliciter auprès des maires la communication des registres nominatifs qu’ils ont constitués pour le recensement des personnes âgées et des personnes en situation de handicap qui en ont fait la demande."]}]}, {"code": "2.G", "title": "Séisme et effondrements de bâtiments", "family": "Risques naturels", "sections": [{"heading": "Événement concerné", "items": ["S’applique :", "À tout événement sismique susceptible d’occasionner des dommages significatifs aux personnes, aux infrastructures ou aux réseaux essentiels ;", "En cas d’effondrements multiples de bâtiments, quelle qu’en soit la cause, dès lors que l’ampleur des dommages est étendue sur plusieurs communes ou que le nombre potentiel de victimes dépasse les capacités de réponse courante communale."]}, {"heading": "Alerte initiale", "items": ["Alerte sismique via bulletin du CEA ou COGIS OU Information / Perception du territoire (CF Fiche B1.1)"]}, {"heading": "Déclenchement", "items": ["Décision du préfet.", "(Pour une simple secousse, DOS MAIRE avec communication centralisée par SRCI)"]}, {"heading": "Scenarii de réfénrece", "items": ["4 scenarii de référence (Cf stratégie de réponse – Fiche B4) :", "Scenario MINEUR (simple secousse) – Cf Fiche 5.1", "Scenario MOYEN (séisme avec dégâts léger sans rupture de flux) - Cf Fiche 5.2", "Scenario MAJEUR (séisme majeur avec rupture de flux) - Cf Fiche 5.3", "Effondrements multiples de bâtiments (Ex : Tempête ALEX - Alpes Maritimes) – Cf Fiche 5.4"]}, {"heading": "Modalités d’alerte", "items": ["Cf Fiche B1.1 et D1 – Messages FR-ALERT", "Actions réflexes", "Prise en compte de la vraisemblance d’un séisme :", "Observer l’activité sismique relevée à partir du site Internet https://sismoazur.oca.eu/#/", "Observer et suivre les relevés d’intensité à partir du site Internet https://www.franceseisme.fr/", "Informer la chaîne ORSEC via GEDICOM (Cf. Fiche B1.2)", "Solliciter des expertises (Cf. Fiche B3) :", "Du BRGM (Permanence téléphonique 24 / 24 – 02 38 64 34 34)", "Forces d’expertise via le COZ :", "du Groupe d’intervention macrosismique (GIM) ;", "de l’Association française du génie parasismique (AFPS) ;", "du Service de traitement d’image et de télédétection (SERTIT).", "Mise en œuvre préventive des moyens permettant la continuité des transmissions à savoir les moyens satellitaires et le réseau radio ADRASEC (Cf. Fiche C7 – D3).", "Risques technologiques"]}]}, {"code": "3.A", "title": "NOVI (« nombreuses victimes »)", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Nombreuses victimes impliquant l’intervention d’importants moyens médicaux (incendie, accident de transport, attentat, effondrement d’immeuble...)"]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM à l’autorité préfectorale – CORG – CIC – SAMU", "Évaluation : où - quand - quoi - moyens- enjeux ?"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale sur proposition du CODIS ou COSSIM", "Dans le cadre d’évènements à vocation purement sanitaire (hors secours à personne), l’ARS et/ou le SAMU propose(nt) au Préfet ou son représentant de mobiliser les acteurs et/ou services concernés (notamment les établissements de santé et médicosociaux, les professionnels de santé, les acteurs extra sanitaires)."]}, {"heading": "Modalités d’alerte", "items": ["Cas général de mise en alerte des services (hors services de secours/ CORG/CIC et SAMU) :", "Astreinte SIRACEDPC pour gréement du COD", "Services du cabinet du préfet de police délégué", "DDTM (coordination des gestionnaires routiers)", "Conseil Départemental (PC sûreté)", "ARS /APHM", "DREAL", "Sous-préfet(s) d’arrondissement(s) concerné(s)", "Communication préfecture", "SINSIC", "COZ (information)"]}, {"heading": "Direction des opérations", "items": ["Le préfet, DOS (Directeur des Opérations de secours), décide la mise en œuvre du plan.", "Active le COD comme base arrière des opérations de secours : PP13, SIRACEDPC, SINSIC, Communication Préfecture, représentants des services concernés (dont DDTM et ARS).", "Habituellement dirigé par le directeur de cabinet, le SIRACEDPC en assure le fonctionnement.", "Désigne un membre du corps préfectoral auprès du COS chargé de diriger le PCO (ou PC interservices auprès du PC de site)", "Décide de l’activation de la CUMP selon l’évaluation faite par APHM et SAMU", "Autorise la levée du plan quand l’opération est terminée, en maintenant un dispositif allégé dans l’attente d’un bilan définitif qui sera diffusé à la presse.", "Le SDIS ou le BMPM désigne le Commandant des Opérations de Secours (COS)", "LE COS :", "diffuse l’arrêté de déclenchement à : SAMU, CORG, CIC (DIPN), DDTM, maire(s), sous-préfet d’arrondissement, autorité judiciaire ;", "mobilise les moyens de secours et de sécurité", "active le PCS (poste de commandement de site inter services) implanté sur le terrain, armé par moyens mobiles SDIS/BMP. Il est dirigé par un membre du corps préfectoral, habituellement le sous-préfet d’arrondissement. Si nécessaire le volet interservices peut être regroupé au sein d’un PCO distinct sous l’autorité du sous-préfet désigné (en règle générale, le sous-préfet d’arrondissement).", "est assisté par :", "Le DSI : Directeur Sauvetage Incendie, chargé des opérations non médicales ;", "Le DSM : Directeur des Secours Médicaux, qui peut être :", "le médecin chef du SDIS, sur le département hors Marseille ;", "le médecin chef du BMP sur la ville de Marseille ;", "le médecin chef du SAMU sur l’aéroport Marseille Provence.", "un PMA « poste médical avancé » qui regroupe, trie, évacue les victimes ;", "le SAMU qui apporte son concours, assure répartition et accueil en hôpitaux ;", "la CUMP : cellule d’urgence médico psychologique organisée par l’APHM et activée selon l’évaluation faite par le SAMU"]}]}, {"code": "3.B", "title": "Novis sinus", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Nombreuses victimes impliquant l’intervention d’importants moyens médicaux (incendie, accident de transport, attentat, effondrement d’immeuble...)", "Information outil", "Le portail SINUS est l’outil national unique par lequel les autorités accèdent à la totalité du dénombrement des victimes.", "Il permet de fournir le plus d’informations possibles sur les victimes afin de faciliter leur identification par l’autorité judiciaire et les services d’enquête compétents, leur prise en charge médicale par les établissements de santé (ES) et l’information des familles et des proches, assurée par la CIAV.", "Procédure", "Ainsi, lors d’un événement générant de nombreuses victimes (accident, attentat..), SINUS va permettre à tous les services de partager les informations relatives aux victimes :", "Les primo-intervenants (pompiers, policiers), vont doter les victimes d’un bracelet SINUS ;", "Au PMA : les victimes seront catégorisées (UA, UR) et orientées vers une structure d’accueil.", "A chaque étape de la chaîne des secours, de nouvelles informations viendront enrichir la base SINUS (pour les personnes ne passant pas par le PMA, ce sont les centres hospitaliers qui les doteront d’un bracelet d’identification).", "Au final, les listes pourront être éditées en COD à destination des autorités :", "par catégorisation : UA, UR, DCD ;", "par identité ;", "par destination hospitalière.", "ATTENTION : pour les personnes décédées, l’autorité judiciaire peut bloquer la liste nominative.", "Adresses SINUS :", "https://sinus.novi.interieur.gouv.fr (pour les cas réels)", "https://formation.sinus.novi.interieur.gouv.fr (pour s’entraîner, pour les exercices).", "Connexion :", "EN COD, SINUS NE PERMET QUE LA CONSULTATION OU L’EDITION DE LISTES"]}]}, {"code": "3.C", "title": "Plan particulier d’intervention", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Accident industriel concernant un établissement SEVESO II - seuil haut – (donc doté d’un plan particulier d’intervention)"]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM à l’autorité préfectorale – CORG – CIC – SAMU", "Évaluation : où - quand - quoi - moyens- enjeux ?"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale"]}, {"heading": "Modalités d’alerte", "items": ["CODIS / COSSIM assurent la transmission de l’alerte aux mairies, organismes et services figurant dans le schéma d’alerte du PPI concerné.", "En cas d’extrême urgence, l’exploitant est compétent pour demander directement auprès des services concernés la mise en œuvre de contre-mesures immédiates (interruption trafic routier, ferroviaire, …)", "Astreinte SIRACEDPC pour gréement du COD", "Services du cabinet du préfet de police délégué", "DDTM (coordination des gestionnaires routiers)", "Conseil Départemental (PC sûreté)", "ARS /APHM", "DREAL", "Sous-préfet(s) d’arrondissement(s) concerné(s)", "Communication préfecture", "SINSIC", "COZ (information)", "Organisation de commandement", "Le préfet, DOS (Directeur des Opérations de secours) :", "Active le COD (SIRACEDPC)", "Désigne le sous-préfet qui dirige le PCO (mis en place par le commandant des opérations de secours)", "Fait préparer un premier communiqué de presse", "Fait rédiger le message de mise en œuvre du PPI et le fait diffuser par le CODIS / COSSIM", "Déclenche les contre-mesures externes immédiates (si celles-ci n’ont pas été activées ou demandées en mode réflexe par l’exploitant) :", "Alerte des populations par : (au signal d’alerte : mise à l’abri, écoute de la radio)", "sirène PPI (exploitant)", "sirène SAIP (COZ)", "ensemble Mobiles d’alerte (mairie/BMPM/SDIS)", "Interruption des circulations de transit : Routière / Ferroviaire / Aérienne (mesure prise par DSAC)", "Fait diffuser par les radios des messages établis par le service Communication", "Si nécessaire, met en œuvre des mesures de sauvegarde complémentaires :", "Évacuation partielle, totale, ou confinement général ;", "Bouclage et surveillance de la zone ;", "Installation de postes médicaux avancés (PMA) ;", "Déclenchement éventuel du NOVI ;", "Ouverture de Centres Médicaux d’Evacuation ;", "Cellule d’Urgence médico-psychologique ;", "Centre d’Accueil et de REgroupement (CARE) des communes dans le cadre de leurs PCS.", "Procède régulièrement à :", "points de situation avec PCO et Exploitant ;", "points presse et communiqués ;", "compte-rendus aux autorités centrales via le COZ ;", "tenue de tableaux des moyens mis en œuvre et demandes de renforts ;", "contacts avec les élus ;", "bilans précis des victimes.", "Active, si nécessaire, une cellule de réponse aux appels du public", "Autorise la levée du dispositif", "CIPChef d'Incident PrincipalInterlocuteur unique du DOSInterface avec les services de l'EIC PACAet de l'EF SNCFCILChef d'Incident LocalInterlocuteur unique du COSAssure la protection despersonnels présents surle siteInterface avec leCOGCCOGCCentre régionalInterlocuteur du CODISAssure la gestion de l'incidentAssure la diffusion de l'informationSupplée le CIL en son absenceDOSDirige les opérations de secoursCOSMets en œuvre les opérations de secoursCODIS / COSSIMMise en œuvre de l'alerteAssure l'interface entre COS etCOGC en l'absence du CIL EIC PACAPREFECTUREServices de secours", "CIP", "Chef d'Incident Principal", "Interlocuteur unique", "du DOS", "Interface avec les", "services de l'EIC PACA", "et de l'EF SNCF", "CIL", "Chef d'Incident Local", "Interlocuteur unique", "du COS", "Assure la protection des", "personnels présents sur", "le site", "Interface avec le", "COGC", "COGC", "Centre régional", "Interlocuteur", "du CODIS", "Assure la gestion de", "l'incident", "Assure la diffusion de", "l'information", "Supplée le CIL en", "son absence", "DOS", "Dirige les opérations de secours", "COS", "Mets en œuvre", "les opérations de secours", "CODIS / COSSIM", "Mise en œuvre de l'alerte", "Assure l'interface entre COS et", "COGC en l'absence du CIL", "EIC PACA", "PREFECTURE", "Services de secours"]}]}, {"code": "3.D", "title": "Réseaux ferroviaires", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Accident grave de chemin de fer impliquant l’intervention de moyens complémentaires à ceux du plan d’intervention et de sécurité (PIS) de l’EIC PACA.", "Déclenchement possible simultané des dispositions ORSEC NOVI et TMD."]}, {"heading": "Alerte initiale", "items": ["par EXPLOITANT à l’autorité préfectorale – CORG – CIC – SAMU", "Évaluation : où - quand - quoi - moyens- enjeux ?"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale sur proposition de l’exploitant", "Zones de compétences", "SDIS :", "aux têtes nord des tunnels de la Nerthe et de Marseille ;", "aux têtes nord et sud des tunnels du Mussuguet et des Janots.", "BMPM :", "aux têtes sud des tunnels de la Nerthe et de Marseille."]}, {"heading": "Modalités d’alerte", "items": ["En cas d’évènements graves ou présentant d'emblée un caractère spécifique susceptible d'entraîner une dégradation de la situation des passagers et/ou des riverains tels que :", "arrêt prolongé d'un train de voyageurs dans un tunnel ;", "accident de personnes ;", "feu sur rame ;", "accident impliquant de nombreuses victimes ;", "fuite d'une substance chimique ou radioactive ;", "Le gestionnaire ferroviaire concerné, active son PIS ou sa procédure d'urgence. Il alerte immédiatement et systématiquement les services publics pour permettre la montée en puissance rapide des moyens de secours. Si un évènement est signalé directement aux services d'incendie et de secours, ces derniers transmettent immédiatement l'information au gestionnaire ferroviaire compétent : CRC du COGC (EIC PACA).", "NB : Le Grand Port Maritime de Marseille et la RDT 13 sont également gestionnaires de réseaux ferroviaires."]}]}, {"code": "3.E", "title": "Aéroport Marseille-Provence", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Accident ou risque d’accident d’un aéronef intervenant", "en ZA (zone d’aérodrome = dans l’emprise de l’aéroport Marseille-Provence)", "en ZVA (zone voisine d’aérodrome = limitée dans le PSS)"]}, {"heading": "Alerte initiale", "items": ["par Tour de contrôle aéroport Marseille-Provence"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale à la demande du directeur de l’aéroport", "Phases", "VEILLE :Il y a état de veille si un pilote signale, ou si l’on soupçonne des défaillances à bord, mais non des défaillances de nature à entraîner normalement des difficultés graves à l’atterrissage (mouvements d’aéronef en essais ou au stade d’expérimentation, vibration moteur, mauvaises conditions de visibilité météorologique.....).", "ALERTE : Il y a état d’alerte si l’on signale ou l’on soupçonne qu’un aéronef a subi, ou risque de subir une défaillance de nature à entraîner un risque d’accident (voyant incendie allumé, fuite d’huile, baisse de pression hydraulique des freins, fumée ou odeur anormale à l’ intérieur de l’aéronef, train d’atterrissage, alerte à la bombe, mauvaises conditions météorologiques...).", "ACCIDENT : Il y a  état d’accident lorsqu’un événement mettant en cause la sécurité de l’aéronef ou de ses passagers (chute, incendie en vol ou au roulage, etc.) vient de se produire ou va inévitablement se produire.", "À la demande du Directeur de l’exploitant de l’aérodrome (CCIMP) ou de son représentant, le Préfet met en œuvre les dispositions spécifiques de l’Aéroport Marseille-Provence."]}, {"heading": "Modalités d’alerte", "items": ["Ouverture d’une cellule de crise (PCO) dès la phase d’alerte, avec les services suivants :", "SIRACEDPC", "Services du cabinet du préfet de police délégué", "DDTM (coordination des gestionnaires routiers)", "Communication préfecture", "SINSIC", "SDIS/BMPM", "GGD", "Compagnie aérienne exploitante ou assistante", "DSAC", "Dès réception du message d’alerte et/ou du message d’accident, le PCO est ouvert et armé par l’exploitant d’aérodrome. Ce dernier installe et s’assure du bon fonctionnement des moyens de communication et de logistique.", "Un PCO (PC directeur) est ouvert et armé par la SPAF avec l’aide de la CCIMP", "Un COD (base arrière) est ouvert en préfecture."]}, {"heading": "Direction des opérations", "items": ["-en ZA et ZVA : la Direction des Opérations de Secours (D.O.S.) est assurée par l’autorité préfectorale. Le DOS (Sous-Préfet d’Istres ou Directeur de Cabinet) est installé dans le PC Opérationnel.", "en ZVA maritime : la responsabilité de la direction des opérations de secours incombe au Préfet des Bouches-du-Rhône."]}]}, {"code": "3.F", "title": "BA 125 (Istres)", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Accident d’un aéronef intervenant en :", "ZA (zone d’aérodrome)", "ZVA (zone voisine d’aérodrome )"]}, {"heading": "Alerte initiale", "items": ["par BA 125"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale sur proposition du commandant de la BA 125 ou du CODIS"]}, {"heading": "Modalités d’alerte", "items": ["Bilan :", "Type d’appareil", "Heure de l’accident", "Coordonnées de l’accident", "Nombre de passagers ou capacité maximale d’aéronef", "Incendie observé ou non (ampleur des dégâts)", "Dangers représentés par l’épave (matières dangereuses, munitions…)", "Etc…", "Services présents au COD :", "Sous-préfet d’Istres ou autre sous-préfet désigné", "SDIS", "SAMU / APHM / ARS", "DIPN", "Gendarmerie", "Mairies d’Istres, Fos-sur-Mer, Saint Martin de Crau", "Conseil Général", "SINSIC", "Communication préfecture"]}, {"heading": "Direction des opérations", "items": ["Le Préfet est le DOS, Directeur des Opérations de Secours.", "Le Directeur départemental du SDIS est le COS, Commandant des Opérations de Secours.", "Le COS détermine l’emplacement du Poste de Commandement Avancé/Poste de Commandement de Site (PCA/PCS) et mobilise les moyens de secours et de sécurité.", "Un COD est activé à la préfecture des Bouches-du-Rhône.", "ACTION PREFECTORALE", "faire diffuser l’alerte des services par le CODIS conformément au schéma général d’alerte,", "prendre l’arrêté de déclenchement des dispositions spécifiques ORSEC BA 125 et le faire diffuser par le CODIS 13 conformément au schéma général d’alerte,", "désigner un membre du corps préfectoral auprès du COS,", "faire préparer dès que possible par le service communication de la préfecture, le message d’alerte aux radios et le premier communiqué de presse,", "informer l’échelon national via le COZ sud,", "faire préparer l’arrêté de levée du plan lorsque la situation le permet."]}]}, {"code": "3.G", "title": "Sauvetage aéro-terrestre (Sater)", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Les dispositions spécifiques Orsec pour sauvetage aéro-terresre (Sater) ont pour objet la recherche terrestre et la localisation précise d'un aéronef en détresse et de leurs occupants.", "La localisation de l’épave provoque l’arrêt des recherches et l’engagement effectif de la phase de secours aux victimes.", "Celle-ci peut nécessiter l’activation des dispositions Orsec NOVI.", "Organisation", "L’organisation « Sater » est déclinée en phases opérationnelles.", "En coordination avec l’ARCC, correspondant aéronautique compétent au titre des recherches aériennes, le préfet de département est le directeur des opérations de recherches terrestres (DOR) dans les phases BRAVO à CHARLIE. Le commandant de la gendarmerie départementale ou le directeur départemental de la sécurité publique est le commandant des opérations de recherches terrestre (COR) dans les phases BRAVO à CHARLIE", "L’ARCC de Lyon informe la préfecture de sa décision d’engager l’ADRASEC par téléphone et par fax de confirmation.", "Prendre contact avec :", "CODIS / COSSIM (prévenu par le COZ sud)", "CORG / CIC", "ADRASEC", "ARCC (pour le tenir informé)"]}]}, {"code": "3.H", "title": "Pollution marine (POLMAR/Terre)", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Les dispositions spécifiques « POLMAR/Terre » du plan ORSEC des Bouches-du-Rhône ont pour objet de faire face à une pollution marine de grande ampleur, par hydrocarbures ou tout autre produit (notamment chimique), résultant d'un accident ou d'une avarie maritime, terrestre ou aérienne."]}, {"heading": "Alerte initiale", "items": ["par CROSSMED, CODIS, COSSIM, GIE, plaisanciers…."]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale"]}, {"heading": "Modalités d’alerte", "items": ["Recouper l’information et obtenir tous renseignements utiles en liaison avec :", "PREMAR ;", "CROSSMED pour apprécier les capacités des moyens de lutte en mer à résorber la pollution et épargner les côtes et anticiper la mise en œuvre éventuelle du dispositif de lutte à terre ;", "Météo-France ;", "CEDRE ;", "CODIS/COSSIM ;", "COZ SUD.", "Anticiper la mise en oeuvre éventuelle du dispositif de lutte à terre par l’alerte/mobilisation :", "du sous-préfet d’arrondissement potentiellement concerné ;", "du/des maire(s), de la /des intercommunalités potentiellement concerné(s) ;", "du conseil général ;", "de la DDTM, de la DREAL, du GPMM et de l’IFREMER.", "Si la situation menace d’évoluer vers une pollution de grande ampleur, le Préfet décide la mise en œuvre, des dispositions spécifiques POLMAR/Terre :", "le DDSIS ou le commandant du BMPM est le COS selon le secteur territorial principalement concerné. Le Préfet lui fait préparer la montée en puissance du schéma de conduite des opérations de lutte ;", "le Préfet donne l’ordre au CODIS (ou au COSSIM) de déclencher l’alerte en vue de l’activation du COD ;", "il fait activer, par le COS, le ou les PCOpérationnel(s) et PCAvancés nécessaires (jusqu’à 4 PCO et 11 PCA prédéterminés) et les chantiers ;", "il convoque au COD les experts (CEDRE, IFREMER.…) ;", "il informe le COZ chargé de l’information des départements littoraux limitrophes (Gard, Var) ;", "il fait procéder à l’échange « d’officiers de liaison » avec PREMAR, et à l’activation d’une cellule communication/presse conjointe si possible."]}, {"heading": "Direction des opérations", "items": ["En mer : Si la menace de pollution ou la pollution en mer présente un degré élevé de gravité ou de complexité, notamment s'il n'est pas possible d'y faire face avec les seuls moyens ordinaires des administrations, le préfet maritime met en oeuvre le plan ORSEC Maritime, dispositions spécifiques « POLMAR ».", "Le préfet maritime est alors chargé de la direction des opérations de lutte en mer sous l'autorité directe du Premier ministre.", "A terre : Si la menace de pollution ou la pollution s'exerce sur le littoral et présente un degré élevé de gravité ou de complexité, notamment s'il n'est pas possible d'y faire face avec les", "seuls moyens ordinaires des collectivités locales et de l'État, le préfet de département met en oeuvre les dispositions spécifiques « POLMAR/Terre ».", "Le préfet de département est alors chargé de la direction des opérations de lutte à terre sous l'autorité du ministre de l'Intérieur.", "(pollutions de petite et moyenne ampleur = « infra polmar » = compétence du maire)", "Face aux pollutions de faible et moyenne ampleur ; les opérations de lutte incombent aux communes et sont dirigées par les Maires qui en supportent le coût financier.", "Si nécessaire, une cellule d’appui aux collectivités peut être réunie autour de l’autorité préfectorale. Elle est composée de la préfecture, de la DDTM, de l’ARS, du SDIS, du BMPM, de la DIRM, de la DREAL, de la DRFiP, de la gendarmerie et/ou de la DIPN, de la DDPP. Orsec POLMAR Terre n’est pas mis en œuvre ."]}]}, {"code": "3.I", "title": "Barrage de Bimont", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Risque de rupture ou rupture du barrage de Bimont.", "Inondation de la vallée de l’Arc, soit 8 communes impactées :", "Zone de proximité immédiate : Le Tholonet, Aix-en-Provence, Meyreuil", "Zone d’inondation spécifique : Ventabren, Velaux, Coudoux, La Fare-les-Oliviers, Berre-l’Etang"]}, {"heading": "Alerte initiale", "items": ["Alerte initiale : Société du canal de Provence vers Préfet, DREAL", "En cas d’extrême urgence, l’exploitant est compétent pour demander directement auprès des services concernés la mise en œuvre de contre-mesures immédiates (interruption trafic routier, ferroviaire, …)", "CIC", "CODIS", "sous-préfet de permanence", "préfet de police", "Maire des communes concernées", "DREAL"]}, {"heading": "Modalités d’alerte", "items": ["Cf. ci-après"]}]}, {"code": "3.J", "title": "Spéléo-secours", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Accident de spéléologie."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM (sur appel d’un particulier)"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale sur proposition du CODIS ou COSSIM"]}, {"heading": "Modalités d’alerte", "items": ["ALERTE DES SERVICES :", "Astreintes SIRACEDPC et Cabinet Préfet de Police", "Fédération Française de Spéléo : Conseiller Technique Départemental (CTD)", "COG (groupement de gendarmerie 13)", "DIPN (CIC : centre d’information et de commandement)", "CODIS/COSSIM", "SAMU /APHM /ARS", "Mairie concernée", "Sous-préfet d’arrondissement concerné", "CMIR sud-est", "Communication préfecture", "COZ sud"]}, {"heading": "Direction des opérations", "items": ["Le préfet, DOS (Directeur des Opérations de secours),", "Désigne le COS : Directeur du SDIS ou Commandant du BMPM (selon zone accident).", "Le COS :", "détermine l’emplacement du PCO (avec la participation du CTD, police, gendarmerie) ;", "demande au maire de prendre immédiatement, sous sa responsabilité, toutes les dispositions nécessaires à l’installation du PCO, au ravitaillement et à l’hébergement ;", "est chargé de la coordination des opérations en surface, et tient le directeur des secours et le maire informés en permanence ;", "fait acheminer moyens et personnels nécessaires au déroulement de l’opération.", "Active le COD ou un PCO au plus près de l’évènement :", "Cabinet Préfet de Police, SIRACEDPC, SINSIC, Communication, représentants des services concernés.", "Si les circonstances le justifient, le préfet peut décider de faire activer en préfecture une cellule légère de suivi, qui monterait en puissance (COD) si les opérations devaient se prolonger."]}]}, {"code": "3.K", "title": "Déminage", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Interventions sur munitions de guerre", "Interventions sur engins explosifs improvisés (EEI) ou alerte à la bombe", "Sécurisation de voyages officiels (VO) de personnalités ou de manifestations socio-culturelles", "Réquisition de terrains privés aux fins de destruction d’urgence des matières activés ou des munitions collectées."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM (sur appel d’un particulier)"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale sur proposition du CODIS ou COSSIM"]}, {"heading": "Modalités d’alerte", "items": ["Cette fiche réflexe comprend les actions à conduire en heures ouvrables (J.H.O) et en heures non ouvrables (J.H.N.O).", "Interventions sur munitions de guerre", "J.H.O :", "Le SIRACEDPC peut être avisé d’une demande d’intervention : particuliers / maires / forces de l'ordre / services de secours.", "se fait adresser un mail de confirmation comportant tous les renseignements utiles pour l’intervention des démineurs, à l'adresse pref-deminage@bouches-du-rhone.gouv.fr", "rappelle les mesures conservatoires à prendre sur les lieux : balisage/interdiction d’accès.", "saisie du centre de déminage de Marseille par mail (cd-marseille@interieur.gouv.fr).", "Si urgence, doubler d’un appel téléphonique sur le portable du chef de centre : 06 26 78 00 49 ou 06 26 78 00 35 ou 06 26 78 00 36.", "J.H.N.O :", "le COGIC (centre opérationnel de gestion interministérielle des crises) est avisé par les forces de l'ordre ou les services de secours ; il saisit le centre de déminage (les munitions de guerre ne justifient en principe pas une intervention immédiate).", "Sur le littoral :", "pour engin immergé ou marqueurs marines, alerter le centre des opérations maritimes (PREMAR), bureau des opérations côtières (cf. annuaire ORSEC).", "Interventions sur EEI ou alerte à la bombe", "J.H.O :", "contacter le cabinet du Préfet de police (secrétariat : 04 96 10 64 31)", "J.H.N.O :", "contacter l’astreinte Cabinet du Préfet de police", "Missions de sécurité sur VO et manifestations", "En principe, ces missions sont programmées : la demande d’intervention est donc exceptionnelle.", "En J.H.N.O : Saisir le COGIC.", "Réquisition de terrains privés aux fins de destruction d’urgence", "J.H.O et J.H.N.O :", "Expertise du démineur chef de la mission relative à la nécessité de détruire au plus près du lieu de découverte de matières actives ou de munitions", "Information du SIRACEDPC / du sous-préfet de permanence ainsi que des services de police ou gendarmerie territorialement compétents par le démineur chef de la mission en cas de refus de mise à disposition d'un terrain privé", "Prise de contact avec le propriétaire du terrain par les services de police ou gendarmerie territorialement compétents. En l'absence d'accord à l'amiable, il est rendu compte sans délai au SIRACEDPC / au sous-préfet de permanence du refus et des motifs invoqués.", "Rédaction par le SIRACEDPC / le cadre d'astreinte du SIRACEDPC de l'arrêté de réquisition et transmission aux services chargés de son exécution (Police Nationale = via la C.I.C. / Gendarmerie Nationale = via le CORG)", "Notification au propriétaire par les services de police ou gendarmerie territorialement compétent et information du maire de la commune concernée"]}, {"heading": "Direction des opérations", "items": ["Risques sanitaire", "Risques divers"]}]}, {"code": "5.A", "title": "Electro-secours", "family": "Risques divers", "sections": [{"heading": "Événement concerné", "items": ["Risque de rupture d'approvisionnement en électricité ou rupture de cet approvisionnement à raison d'un aléa climatique, d'une défaillance technique ou d'un acte de malveillance."]}, {"heading": "Alerte initiales", "items": ["par CODIS, COSSIM"]}, {"heading": "Déclenchement", "items": ["Décision du PREFET"]}, {"heading": "Direction des opérations", "items": ["Les réseaux de transport et de distribution ont pour fonction d’acheminer l’électricité en assurant l’équilibre entre l’offre et la demande. Cette adéquation garantit l’approvisionnement des", "clients dans des conditions optimales de sûreté, de fiabilité et de compétitivité. Deux filiales d’EDF se partagent la tâche :", "- RTE (Réseau de Transport d’Électricité) transporte l’électricité haute et très haute tension,", "- ENEDIS gère le réseau de distribution qui achemine l’électricité vendue par les fournisseurs d’énergie, quels qu’ils soient aux utilisateurs (particuliers, entreprises, collectivités).", "Enedis a :", "- la charge des travaux de rétablissement du réseau avec les moyens du plan ADEL et la facilitation des pouvoirs publics ;", "- la responsabilité technique des raccordements des alimentations de secours pour les usagers sensibles raccordés au réseau de distribution basse tension."]}, {"heading": "Modalités d’alerte", "items": ["Prévenir le sous-préfet de permanence. Si plan déclenché, aller au point 2.", "Alerte des services :", "BMPM", "DREAL", "ARS", "SAMU", "APHM", "DDTM", "Sous-préfet d’arrondissement concerné", "Communication préfecture", "SINSIC", "Personnel SIRACEDPC", "En temps que de besoin : ERDF, RTE, DDPP, DDCS, METEO, MAMP, CD13, PP13, SNCF, DSDEN etc.."]}]}], "glossary": ["ADRASEC : Association départementale des radioamateurs au service de la sécurité civile", "AFPS : Association française du génie parasismique", "APHM : Assistance publique – Hôpitaux de Marseille", "APIC : Avertissement Pluies Intenses à la Commune (service Météo-France)", "ARCC : Centre de coordination et de contrôle des routes aériennes (Air Route Control Center)", "ARS : Agence régionale de santé", "ASF : Autoroutes du Sud de la France", "BA 125 : Base aérienne 125 d'Istres", "BASC : Base aérienne de sécurité civile", "BMPM : Bataillon de marins-pompiers de Marseille", "BRGM : Bureau de recherches géologiques et minières", "CCIMP : Chambre de commerce et d'industrie métropolitaine Provence", "CEA : Commissariat à l'énergie atomique et aux énergies alternatives", "CEDRE : Centre de documentation, de recherche et d'expérimentations sur les pollutions accidentelles des eaux", "CIAV : Cellule interministérielle d'aide aux victimes", "CIC : Centre d'information et de commandement (Direction départementale de la sécurité publique)", "CIGT : Centre d'ingénierie et de gestion du trafic", "CMIR : Centre météorologique interrégional (Météo-France)", "COD : Centre opérationnel départemental", "CODIS : Centre opérationnel départemental d'incendie et de secours", "COG : Centre opérationnel de la gendarmerie", "COGIC : Centre opérationnel de gestion interministérielle des crises", "COGIS : Centre opérationnel de gestion et d'information sismique (CEA)", "CORG : Centre opérationnel de la gendarmerie (régional)", "COS : Commandant des opérations de secours", "COSSIM : Centre opérationnel des services de secours et d''incendie de Marseille", "COZ : Centre opérationnel de zone", "CRICR : Centre régional d'information et de coordination routières", "CROSSMED : Centre régional opérationnel de surveillance et de sauvetage Méditerranée", "CRS : Compagnie républicaine de sécurité", "CUMP : Cellule d'urgence médico-psychologique", "DASEN : Directeur académique des services de l'éducation nationale", "DDDCS : Direction départementale déléguée à la cohésion sociale", "DDPP : Direction départementale de la protection des populations", "DDTM : Direction départementale des territoires et de la mer", "DIPN : Direction interdépartementale de la police nationale", "DIRECCTE : Direction régionale des entreprises, de la concurrence, de la consommation, du travail et de l'emploi", "DIRM : Direction interrégionale de la mer", "DMD : Délégué militaire départemental", "DOS : Directeur des opérations de secours", "DREAL : Direction régionale de l'environnement, de l'aménagement et du logement", "DSAC : Direction de la sécurité de l'aviation civile", "EDF : Électricité de France", "EIC PACA : Établissement Infrastructure de Circulation PACA (SNCF)", "EMIZDS : État-major interministériel de zone de défense et de sécurité", "ENEDIS : Gestionnaire du réseau de distribution d'électricité (ex-ERDF)", "ESCOTA : Société des autoroutes Estérel Côte d'Azur Provence Alpes", "FR-ALERT : Système national d'alerte et d'information des populations par téléphone mobile", "GEDICOM : Outil de gestion de crise du COGIC (remontée des informations opérationnelles)", "GGD : Groupement de gendarmerie départementale", "GIM : Groupe d'intervention macrosismique", "GPMM : Grand Port Maritime de Marseille", "IFREMER : Institut français de recherche pour l'exploitation de la mer", "MAMP : Métropole Aix-Marseille-Provence", "NOVI : Nombreuses victimes", "ORSAN-CLIM : Organisation de la réponse du système de santé – volet canicule et chaleur extrême", "ORSEC : Organisation de la réponse de sécurité civile", "PC : Poste de commandement", "PCA : Poste de commandement avancé", "PCO : Poste de commandement opérationnel", "PCS : Plan communal de sauvegarde", "PIS : Poste d'information et de soins", "PMA : Poste médical avancé", "POLMAR : Plan de lutte contre les pollutions marines", "PPI : Plan particulier d'intervention", "PREMAR : Préfet maritime", "PSS : Plan de secours spécialisé", "RDT 13 : Régie des transports métropolitains (réseau de transport du département 13)", "RIC : Règlement de surveillance, de prévision et de transmission de l'information sur les crues", "RTE : Réseau de transport d'électricité", "SAIP : Système d'alerte et d'information des populations", "SAMU : Service d'aide médicale urgente", "SDIS : Service départemental d'incendie et de secours", "SERTIT : Service de traitement d'image et de télédétection (Université de Strasbourg)", "SINSIC : Service de l’innovation numérique et des systèmes d’information et de communication", "SINUS : Système d'information numérique unifié de suivi des victimes", "SIRACEDPC : Service interministériel régional des affaires civiles et économiques de défense et de la protection civile", "SNCF : Société nationale des chemins de fer français", "SPC : Service de prévision des crues", "SPZEF : Bulletin spécial de zone et espaces frontaliers (Météo-France)", "SRCI : Service régional de communication et d'information", "TMD : Transport de matières dangereuses", "VNF : Voies navigables de France", "ZA : Zone d'accueil", "ZVA : Zone de vie des victimes autonomes"]};
const DEFAULT_COMMAND_TYPES = [['Activation de la cellule de suivi',"J'active une cellule de suivi."],['Prise de direction des opérations',"Je prends la direction des opérations."],['Mise en oeuvre de certaines mesures d\'un dispositif ORSEC',"Je mets en oeuvre certaines mesures d'un dispositif ORSEC."],['Activation d\'un dispositif opérationnel ORSEC',"J'active un dispositif opérationnel ORSEC."],['Levée de certaines mesures d\'un dispositif ORSEC',"Je lève certaines mesures d'un dispositif ORSEC."],['Levée de l\'ensemble des mesures d\'un dispositif ORSEC',"Je lève l'ensemble des mesures des dispositions ORSEC mises en oeuvre."]];
let commandTypes = DEFAULT_COMMAND_TYPES.map(x => x.slice());

const COMMAND_SERVICE_FIXED_LABELS = ['SDIS', 'PPD', 'BMPM', 'DIPN', 'SAMU', 'GGD', 'ARS', 'CRS', 'DDTM', 'DMD', 'DREAL', 'MÉTROPOLE'];
const COMMAND_SERVICE_EXTRA_SLOTS = 4;

function getDefaultCommandServices() {
  return COMMAND_SERVICE_FIXED_LABELS.map((label) => ({
    name: label,
    fixedLabel: label,
    cod: false,
    pco: false
  }));
}

const defaultServices = getDefaultCommandServices();

// ────────────────────────────────────────────────────────────────────────────
// 2. COUCHE STORAGE (isolée — synchro locale + Supabase)
// ────────────────────────────────────────────────────────────────────────────
const Storage = window.SICODApi?.storage || {
  load() { return null; },
  save() {}
};

// ────────────────────────────────────────────────────────────────────────────
// 3. ÉTAT APPLICATIF — unique, initialisé une seule fois
// ────────────────────────────────────────────────────────────────────────────
const DEFAULT_DYNAMIC_LISTS = {
  directoryGroups: ['Autorité - Ordre public - Justice','Secours - Santé - Médical','Environnement - Energie','Circulation - Transport','Militaire','CIP','Collectivités territoriales','Autres'],
  planTypes: ["DG (Dispositions générales)","DS (Dispositions spécifiques)","PPI (Plan particulier d'intervention)"],
  planPriorities: ['P1','P2','P3'],
  planStatuses: ['A jour','A programmer','En cours'],
  planRiskTypes: ['Naturel','Technologique','Sanitaire','Sécurité publique','Transport','Autre'],
  dutyRoles: ['Astreinte 1','Astreinte 2'],
  dutyAgents: [],
  reflexFamilies: ['Risques naturels','Risques technologiques','Risques divers','Autres'],
  directoryEntities: ['Autres']
};

const DEFAULT_SETTINGS = {
  theme: 'light',
  psFormat: 'detail',
  classification: 'Non protégé',
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
  dutyRoleAgents: {},
  planExpiryYears: {},
  dynamicLists: {}
};

const UI_STATE_KEYS = Object.freeze([
  'selectedCommandId',
  'currentEventId',
  'currentEventWorkspaceTab',
  'selectedPSId',
  'selectedFiche'
]);

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
    currentEventWorkspaceTab: 'timeline',
    selectedPSId: null,
    selectedFiche: (reflexLibrary.fiches[0] || {}).code || null,
    reflexFiches: JSON.parse(JSON.stringify(reflexLibrary.fiches || [])),
    reflexGlossary: JSON.parse(JSON.stringify(reflexLibrary.glossary || [])),
    planItems: [],
    dutyAvailabilities: [],
    dutySchedule: [],
    tableSorts: {},
    settings: Object.assign({}, DEFAULT_SETTINGS, { dynamicLists: {} })
  };
}

// Chargement unique de l'état
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
const selectionState = {
  contacts: new Set(),
  planItems: new Set()
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

// persist() — unique, stable
function persist() {
  Storage.save(createPersistedStateSnapshot(state));
}

function canWriteApplicationState() {
  const authState = window.SICODApi?.system?.getAuthState?.() || {};
  if (!authState.configured) return true;
  return !!authState.canWrite;
}

function ensureWriteAccess(message = "Votre compte est en lecture seule. Les modifications ne peuvent pas être enregistrées.") {
  if (canWriteApplicationState()) return true;
  showToast(message, 'error');
  return false;
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

function createPersistedStateSnapshot(snapshot) {
  const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const persisted = JSON.parse(JSON.stringify(source));
  UI_STATE_KEYS.forEach((key) => {
    delete persisted[key];
  });
  return persisted;
}

function normalizeRemoteStateSnapshot(snapshot) {
  const source = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : {};
  const defaults = buildDefaultState();
  const persistedSource = Object.assign({}, source);
  UI_STATE_KEYS.forEach((key) => {
    delete persistedSource[key];
  });
  const normalized = Object.assign({}, defaults, persistedSource);
  const arrayKeys = [
    'events',
    'ps',
    'contacts',
    'tools',
    'services',
    'commandMessages',
    'reflexFiches',
    'reflexGlossary',
    'planItems',
    'dutyAvailabilities',
    'dutySchedule'
  ];
  arrayKeys.forEach((key) => {
    if (!Array.isArray(normalized[key])) normalized[key] = defaults[key];
  });
  normalized.settings = Object.assign({}, DEFAULT_SETTINGS, persistedSource.settings && typeof persistedSource.settings === 'object' ? persistedSource.settings : {});
  normalized.settings.dynamicLists = Object.assign({}, persistedSource.settings?.dynamicLists && typeof persistedSource.settings.dynamicLists === 'object' ? persistedSource.settings.dynamicLists : {});
  normalized.settings.remoteSync = Object.assign({}, DEFAULT_SETTINGS.remoteSync, normalized.settings.remoteSync || {});
  normalized.settings.pdfAppearance = Object.assign({}, DEFAULT_SETTINGS.pdfAppearance, normalized.settings.pdfAppearance || {});
  normalized.settings.planExpiryYears = normalized.settings.planExpiryYears && typeof normalized.settings.planExpiryYears === 'object'
    ? normalized.settings.planExpiryYears
    : {};
  return normalized;
}

// ────────────────────────────────────────────────────────────────────────────
// 4. UTILITAIRES GLOBAUX
// ────────────────────────────────────────────────────────────────────────────

/** Échappe le HTML pour insertion sécurisée */
function esc(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

/** Convertit les sauts de ligne en <br> avec échappement */
function nl2br(s) {
  return esc(s).replace(/\n/g, '<br>');
}

/** Génère un identifiant unique court */
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

/** Retourne le titre d'un événement depuis son id */
function getEventTitle(id) {
  return (byId(state.events, id) || {}).title || 'Événement supprimé';
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

/** Formate une date ISO ou Date en format français jj/mm/aaaa */
function formatDateFR(value){if(!value)return '';const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return `${m[3]}/${m[2]}/${m[1]}`;const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;}

/** Retourne l'heure actuelle HH:MM */
function timeHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

/** Génère un badge HTML selon le statut */
function badge(status) {
  if (status === 'Archivé') return `<span class="badge warning">Archivé</span>`;
  if (status === 'Diffusé' || status === 'Validé') return `<span class="badge success">${esc(status)}</span>`;
  return `<span class="badge info">${esc(status || 'Brouillon')}</span>`;
}

const ACTION_ICONS = {
  add: 'assets/icons/Icones/System/add-line.svg',
  edit: 'assets/icons/Icones/Design/edit-line.svg',
  delete: 'assets/icons/Icones/System/delete-bin-line.svg',
  duplicate: 'assets/icons/Icones/Document/file-copy-line.svg',
  open: 'assets/icons/Icones/System/eye-line.svg',
  close: 'assets/icons/Icones/System/close-line.svg',
  save: 'assets/icons/Icones/Device/save-line.svg',
  archive: 'assets/icons/Icones/Business/archive-line.svg',
  restore: 'assets/icons/Icones/Business/inbox-unarchive-line.svg',
  access: 'assets/icons/Icones/Others/door-open-line.svg',
  refresh: 'assets/icons/Icones/System/refresh-line.svg'
};

function actionIconButton(icon, label, onclick, options = {}) {
  const variant = options.variant || 'secondary';
  const disabled = options.disabled ? ' disabled' : '';
  const extraClass = options.className ? ` ${options.className}` : '';
  return `<button class="fr-btn ${variant} small icon-action${extraClass}" type="button" onclick="${onclick}" title="${esc(label)}" aria-label="${esc(label)}"${disabled}><img src="${esc(ACTION_ICONS[icon] || ACTION_ICONS.open)}" alt=""></button>`;
}

function getTableSort(tableKey, fallbackKey, fallbackDirection = 'asc') {
  const value = state.tableSorts?.[tableKey];
  if (value?.key) return value;
  return { key: fallbackKey, direction: fallbackDirection };
}

function setTableSort(tableKey, key) {
  state.tableSorts = state.tableSorts || {};
  const current = state.tableSorts[tableKey];
  const direction = current?.key === key && current?.direction === 'asc' ? 'desc' : 'asc';
  state.tableSorts[tableKey] = { key, direction };
  persist();
}

function sortItems(items, tableKey, fallbackKey, fallbackDirection, selectors) {
  const sort = getTableSort(tableKey, fallbackKey, fallbackDirection);
  const direction = sort.direction === 'desc' ? -1 : 1;
  const getter = selectors?.[sort.key] || (() => '');
  return [...items].sort((a, b) => {
    const left = getter(a);
    const right = getter(b);
    const aVal = left == null ? '' : left;
    const bVal = right == null ? '' : right;
    if (typeof aVal === 'number' || typeof bVal === 'number') {
      return ((Number(aVal) || 0) - (Number(bVal) || 0)) * direction;
    }
    return String(aVal).localeCompare(String(bVal), 'fr', { numeric: true, sensitivity: 'base' }) * direction;
  });
}

function sortableTh(tableKey, key, label, fallbackKey, fallbackDirection = 'asc') {
  const sort = getTableSort(tableKey, fallbackKey, fallbackDirection);
  const indicator = sort.key === key ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : '';
  return `<th class="sortable-th" role="button" tabindex="0" onclick="sortTableColumn('${tableKey}','${key}')" onkeydown="handleSortHeaderKey(event,'${tableKey}','${key}')">${esc(label)}${indicator}</th>`;
}

function sortTableColumn(tableKey, key) {
  setTableSort(tableKey, key);
  renderAll();
}

function handleSortHeaderKey(event, tableKey, key) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  sortTableColumn(tableKey, key);
}

/** Parse une date locale ISO en objet Date (à midi pour éviter les décalages TZ) */
const PS_ALLOWED_STATUSES = ['Brouillon', 'Diffusé'];
function normalizePublishStatus(status, fallback = 'Brouillon') {
  const value = String(status || '').trim();
  if (!value) return fallback;
  if (value === 'Diffusé' || value === 'Validé') return 'Diffusé';
  if (value === 'Brouillon' || value === 'Ouvert') return 'Brouillon';
  return fallback;
}

function buildFixedSignatureLines(signature) {
  const sig = signature || {};
  const lines = [];
  if (sig.mode === 'delegation') {
    lines.push('Pour le préfet, par délégation');
    if (sig.role) lines.push(sig.role);
    if (sig.name) {
      lines.push('');
      lines.push(sig.name);
    }
    return lines;
  }
  lines.push('Le préfet');
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

/** Formate une Date en chaîne locale française */
function formatDateLocal(dt) {
  if (!dt || isNaN(dt)) return '—';
  return dt.toLocaleDateString('fr-FR');
}

function formatIsoDateForDisplay(value) {
  const date = parseDateLocal(value);
  return date ? formatDateLocal(date) : (value || '—');
}

/** Retourne le lundi de la semaine contenant dt */
function startOfMonday(dt) {
  const d = new Date(dt);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextWeekBoundary(monday) {
  const d = new Date(monday);
  d.setDate(d.getDate() + 7);
  d.setHours(12, 0, 0, 0);
  return d;
}

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
}

function isFrenchPublicHoliday(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  const year = date.getFullYear();
  const key = `${date.getMonth() + 1}-${date.getDate()}`;
  const fixed = new Set(['1-1', '5-1', '5-8', '7-14', '8-15', '11-1', '11-11', '12-25']);
  if (fixed.has(key)) return true;
  const easter = getEasterSunday(year);
  const movable = [1, 39, 50].map((offset) => toLocalISO(addDays(easter, offset)));
  return movable.includes(toLocalISO(date));
}

function getDutyActualStart(anchorDate) {
  if (isFrenchPublicHoliday(anchorDate)) return addDays(anchorDate, 1);
  return new Date(anchorDate);
}

function buildDutyPeriods(rangeStart, rangeEnd) {
  const firstAnchor = startOfMonday(rangeStart);
  const lastAnchor = nextWeekBoundary(rangeEnd);
  const anchors = [];
  for (let cur = new Date(firstAnchor); cur <= lastAnchor; cur.setDate(cur.getDate() + 7)) {
    anchors.push(new Date(cur));
  }
  anchors.push(nextWeekBoundary(lastAnchor));
  const actualStarts = anchors.map((anchor) => getDutyActualStart(anchor));
  const periods = [];
  for (let i = 0; i < actualStarts.length - 1; i += 1) {
    const start = actualStarts[i];
    const end = actualStarts[i + 1];
    if (start > rangeEnd && i > 0) break;
    periods.push({
      anchor: anchors[i],
      start,
      end,
      startKey: toLocalISO(start),
      endKey: toLocalISO(end),
      carryHoliday: isFrenchPublicHoliday(anchors[i + 1])
    });
  }
  return periods;
}

/** Retourne la liste dynamique configurée pour une clé, avec fallback */
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

/** Affiche une boîte de confirmation asynchrone — retourne Promise<boolean> */
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

function isInteractiveTableTarget(target) {
  return !!target?.closest?.('input, button, a, label, select, textarea');
}

function getSelectionSet(type) {
  return selectionState[type] instanceof Set ? selectionState[type] : new Set();
}

function queueSelectionRender(renderFnName) {
  if (!renderFnName || typeof window[renderFnName] !== 'function') return;
  window.setTimeout(() => {
    if (typeof window[renderFnName] === 'function') window[renderFnName]();
  }, 0);
}

function setVisibleSelection(type, ids, checked, renderFnName) {
  const set = getSelectionSet(type);
  (Array.isArray(ids) ? ids : []).forEach((id) => {
    if (!id) return;
    if (checked) set.add(id);
    else set.delete(id);
  });
  queueSelectionRender(renderFnName);
}

function toggleSingleSelection(type, id, checked, renderFnName) {
  if (!id) return;
  const set = getSelectionSet(type);
  if (checked) set.add(id);
  else set.delete(id);
  queueSelectionRender(renderFnName);
}

function clearSelection(type, renderFnName) {
  getSelectionSet(type).clear();
  queueSelectionRender(renderFnName);
}

function isSelectionChecked(type, id) {
  return getSelectionSet(type).has(id);
}

function sanitizeSelection(type, validIds) {
  const valid = new Set((Array.isArray(validIds) ? validIds : []).filter(Boolean));
  const set = getSelectionSet(type);
  Array.from(set).forEach((id) => {
    if (!valid.has(id)) set.delete(id);
  });
}

function toJsStringArrayLiteral(values) {
  return `[${(Array.isArray(values) ? values : []).filter(Boolean).map((value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(',')}]`;
}

function buildSelectionToolbar(type, visibleIds, selectedLabel, renderFnName, deleteFnName) {
  const ids = (Array.isArray(visibleIds) ? visibleIds : []).filter(Boolean);
  const selectedCount = ids.filter((id) => isSelectionChecked(type, id)).length;
  const allSelected = ids.length > 0 && selectedCount === ids.length;
  return `<div class="bulk-toolbar">
    <div class="bulk-toolbar-info">${selectedCount} ${esc(selectedLabel)} sélectionnée(s)</div>
    <div class="list-actions">
      <button class="fr-btn secondary small" type="button" onclick="${allSelected ? `clearSelection('${type}','${renderFnName}')` : `setVisibleSelection('${type}', ${toJsStringArrayLiteral(ids)}, true, '${renderFnName}')`}">${allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</button>
      <button class="fr-btn danger small" type="button" onclick="${deleteFnName}()" ${selectedCount ? '' : 'disabled'}>Supprimer la sélection</button>
    </div>
  </div>`;
}

function buildSelectionHeaderCheckbox(type, ids, renderFnName) {
  const cleanIds = (Array.isArray(ids) ? ids : []).filter(Boolean);
  const selectedCount = cleanIds.filter((id) => isSelectionChecked(type, id)).length;
  const checked = cleanIds.length > 0 && selectedCount === cleanIds.length;
  return `<button type="button" class="selection-toggle${checked ? ' is-checked' : ''}" aria-label="Sélectionner toutes les lignes visibles" aria-pressed="${checked ? 'true' : 'false'}" onclick="event.stopPropagation();setVisibleSelection('${type}', ${toJsStringArrayLiteral(cleanIds)}, ${checked ? 'false' : 'true'}, '${renderFnName}')">${checked ? '&#10003;' : ''}</button>`;
}

function buildSelectionRowCheckbox(type, id, renderFnName) {
  const checked = isSelectionChecked(type, id);
  return `<button type="button" class="selection-toggle${checked ? ' is-checked' : ''}" aria-label="Sélectionner la ligne" aria-pressed="${checked ? 'true' : 'false'}" onclick="event.stopPropagation();toggleSingleSelection('${type}', '${id}', ${checked ? 'false' : 'true'}, '${renderFnName}')">${checked ? '&#10003;' : ''}</button>`;
}

function handleSelectableRowClick(event, callback) {
  if (event?.target?.closest?.('.table-select-col')) return;
  if (isInteractiveTableTarget(event?.target)) return;
  if (typeof callback === 'function') callback();
}

async function deleteSelectedContacts() {
  const ids = Array.from(getSelectionSet('contacts'));
  if (!ids.length) return;
  if (!await confirmAsync(`Supprimer ${ids.length} contact(s) sélectionné(s) ?`)) return;
  if (!ensureWriteAccess()) return;
  ids.forEach((id) => window.SICODDataModel?.archiveRecord(state.contacts, id));
  clearSelection('contacts');
  persist();
  renderDirectory();
}

async function deleteSelectedPlanItems() {
  const ids = Array.from(getSelectionSet('planItems'));
  if (!ids.length) return;
  if (!await confirmAsync(`Supprimer ${ids.length} planification(s) sélectionnée(s) ?`)) return;
  if (!ensureWriteAccess()) return;
  ids.forEach((id) => window.SICODDataModel?.archiveRecord(state.planItems, id));
  clearSelection('planItems');
  persist();
  renderPlanning();
}

/** Marque binaire pour les exports PDF */
function mark(v) { return v ? '[X]' : '[ ]'; }

/** Télécharge un Blob sous forme de fichier */
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
}

/** Génère et télécharge un CSV */
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

function countDelimiterOutsideQuotes(line, delimiter) {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === delimiter) count += 1;
  }
  return count;
}

function detectCsvDelimiter(text) {
  const firstLine = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .split('\n')
    .find((line) => line.trim());
  if (!firstLine) return ';';
  return countDelimiterOutsideQuotes(firstLine, ';') >= countDelimiterOutsideQuotes(firstLine, ',') ? ';' : ',';
}

function parseCsvRows(text, delimiter = detectCsvDelimiter(text)) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (inQuotes && source[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === delimiter) {
      row.push(value.trim());
      value = '';
      continue;
    }
    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      value = '';
      continue;
    }
    value += char;
  }
  row.push(value.trim());
  if (row.some((cell) => cell !== '')) rows.push(row);
  return rows;
}

const DOCX_TEMPLATE_FILES = {
  mainCourante: 'assets/templates/docx/main-courante.docx',
  psDetail: 'assets/templates/docx/ps-detail.docx',
  psFocus: 'assets/templates/docx/ps-focus.docx',
  astreinte: 'assets/templates/docx/astreinte.docx',
  astreinteStat: 'assets/templates/docx/astreinte-stat.docx',
  ficheReflexe: 'assets/templates/docx/fiches-reflexes.docx',
  annuaire: 'assets/templates/docx/annuaire.docx',
  planification: 'assets/templates/docx/planification.docx',
  planificationStat: 'assets/templates/docx/planification-stat.docx',
  commandMessage: 'assets/templates/docx/message-commandement.docx'
};

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ZIP_MIME = 'application/zip';
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DOC_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const PX_TO_EMU = 9525;

function ensureDocxEngine() {
  if (!window.JSZip) {
    throw new Error("Le moteur d'export DOCX n'est pas disponible.");
  }
  return window.JSZip;
}

async function loadDocxTemplateZip(key) {
  const JSZip = ensureDocxEngine();
  const path = DOCX_TEMPLATE_FILES[key];
  if (!path) {
    throw new Error(`Modèle DOCX inconnu : ${key}`);
  }
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Modèle introuvable (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  return JSZip.loadAsync(buffer);
}

async function loadDocxDocument(key) {
  const zip = await loadDocxTemplateZip(key);
  const doc = await loadDocxXml(zip, 'word/document.xml');
  return { zip, doc };
}

function saveDocxDocument(zip, doc) {
  saveDocxXml(zip, 'word/document.xml', doc);
  return zip;
}

async function loadDocxXml(zip, path) {
  const entry = zip.file(path);
  if (!entry) {
    throw new Error(`Le modèle DOCX ne contient pas ${path}.`);
  }
  const xml = await entry.async('string');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error(`Le XML ${path} du modèle DOCX est invalide.`);
  }
  return doc;
}

function saveDocxXml(zip, path, doc) {
  const serializer = new XMLSerializer();
  zip.file(path, serializer.serializeToString(doc));
  return zip;
}

function getWordTextNodes(root) {
  return Array.from(root.getElementsByTagNameNS(WORD_NS, 't'));
}

function replacePlaceholderText(root, placeholder, replacement, replaceAll = true) {
  const finalValue = String(replacement ?? '');
  if (replaceAll && placeholder && finalValue.includes(placeholder)) {
    throw new Error(`Remplacement circulaire détecté pour ${placeholder}.`);
  }
  let didReplace = false;
  while (true) {
    const nodes = getWordTextNodes(root);
    let fullText = '';
    const ranges = nodes.map((node) => {
      const start = fullText.length;
      const value = node.textContent || '';
      fullText += value;
      return { node, start, end: fullText.length };
    });
    const matchIndex = fullText.indexOf(placeholder);
    if (matchIndex === -1) break;
    const matchEnd = matchIndex + placeholder.length;
    let wroteReplacement = false;
    ranges.forEach(({ node, start, end }) => {
      if (end <= matchIndex || start >= matchEnd) return;
      const original = node.textContent || '';
      const localStart = Math.max(0, matchIndex - start);
      const localEnd = Math.min(end, matchEnd) - start;
      if (!wroteReplacement) {
        node.textContent = original.slice(0, localStart) + finalValue + original.slice(localEnd);
        wroteReplacement = true;
      } else {
        node.textContent = original.slice(0, localStart) + original.slice(localEnd);
      }
    });
    didReplace = true;
    if (!replaceAll) break;
  }
  return didReplace;
}

function replacePlaceholderTextWithBreaks(root, placeholder, replacement, replaceAll = true) {
  const finalValue = String(replacement ?? '');
  if (!finalValue.includes('\n')) {
    return replacePlaceholderText(root, placeholder, finalValue, replaceAll);
  }
  const xmlDoc = root?.ownerDocument || root;
  const lines = finalValue.split('\n');
  let didReplace = false;
  while (true) {
    const nodes = getWordTextNodes(root);
    let fullText = '';
    const ranges = nodes.map((node) => {
      const start = fullText.length;
      const value = node.textContent || '';
      fullText += value;
      return { node, start, end: fullText.length };
    });
    const matchIndex = fullText.indexOf(placeholder);
    if (matchIndex === -1) break;
    const matchEnd = matchIndex + placeholder.length;
    const affected = ranges.filter(({ start, end }) => end > matchIndex && start < matchEnd);
    const first = affected[0];
    const last = affected[affected.length - 1];
    if (!first?.node) break;
    const firstText = first.node.textContent || '';
    const lastText = last?.node?.textContent || '';
    const firstLocalStart = Math.max(0, matchIndex - first.start);
    const lastLocalEnd = Math.min(last.end, matchEnd) - last.start;
    const before = firstText.slice(0, firstLocalStart);
    const after = lastText.slice(lastLocalEnd);
    const run = first.node.parentNode;
    if (!run) break;
    first.node.textContent = before + lines[0];
    affected.slice(1).forEach(({ node }) => { node.textContent = ''; });
    let insertAfter = first.node;
    lines.slice(1).forEach((line) => {
      const br = xmlDoc.createElementNS(WORD_NS, 'w:br');
      run.insertBefore(br, insertAfter.nextSibling);
      insertAfter = br;
      const textNode = xmlDoc.createElementNS(WORD_NS, 'w:t');
      textNode.setAttributeNS(XML_NS, 'xml:space', 'preserve');
      textNode.textContent = line;
      run.insertBefore(textNode, insertAfter.nextSibling);
      insertAfter = textNode;
    });
    if (after) {
      const tailNode = xmlDoc.createElementNS(WORD_NS, 'w:t');
      tailNode.setAttributeNS(XML_NS, 'xml:space', 'preserve');
      tailNode.textContent = after;
      run.insertBefore(tailNode, insertAfter.nextSibling);
    }
    didReplace = true;
    if (!replaceAll) break;
  }
  return didReplace;
}

function replacePlaceholderSequence(root, placeholder, replacements) {
  (replacements || []).forEach((value) => replacePlaceholderText(root, placeholder, value, false));
}

function findWordBody(root) {
  return root.getElementsByTagNameNS(WORD_NS, 'body')[0] || root.documentElement;
}

function findWordParagraphs(root) {
  return Array.from(root.getElementsByTagNameNS(WORD_NS, 'p'));
}

function findWordRows(root) {
  return Array.from(root.getElementsByTagNameNS(WORD_NS, 'tr'));
}

function findWordTables(root) {
  return Array.from(root.getElementsByTagNameNS(WORD_NS, 'tbl'));
}

function replaceRowsMatchingText(root, matchText, items, fillRow) {
  const templateRows = findWordRows(root).filter((row) => (row.textContent || '').includes(matchText));
  if (!templateRows.length) return false;
  const parent = templateRows[0].parentNode;
  const anchor = templateRows[0];
  (items || []).forEach((item) => {
    const clone = templateRows[0].cloneNode(true);
    fillRow(clone, item);
    parent.insertBefore(clone, anchor);
  });
  templateRows.forEach((row) => row.parentNode === parent && parent.removeChild(row));
  return true;
}

function replaceRowsMatchingTextInTable(table, matchText, items, fillRow) {
  const templateRows = findWordRows(table).filter((row) => (row.textContent || '').includes(matchText));
  if (!templateRows.length) return false;
  const parent = templateRows[0].parentNode;
  const anchor = templateRows[0];
  (items || []).forEach((item) => {
    const clone = templateRows[0].cloneNode(true);
    fillRow(clone, item);
    parent.insertBefore(clone, anchor);
  });
  templateRows.forEach((row) => row.parentNode === parent && parent.removeChild(row));
  return true;
}

function createWordXmlFragment(ownerDoc, xml) {
  const parser = new DOMParser();
  const wrapped = parser.parseFromString(`
    <root
      xmlns:w="${WORD_NS}"
      xmlns:r="${DOC_REL_NS}"
      xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
      xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
      xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
      xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
    >${xml}</root>
  `, 'application/xml');
  if (wrapped.getElementsByTagName('parsererror').length) {
    throw new Error("Impossible de générer le fragment XML DOCX.");
  }
  return ownerDoc.importNode(wrapped.documentElement.firstElementChild, true);
}

function guessImageExtension(mime = '', src = '') {
  const cleanMime = String(mime || '').toLowerCase();
  if (cleanMime.includes('png')) return 'png';
  if (cleanMime.includes('jpeg') || cleanMime.includes('jpg')) return 'jpg';
  if (cleanMime.includes('webp')) return 'webp';
  if (cleanMime.includes('gif')) return 'gif';
  if (cleanMime.includes('svg')) return 'svg';
  const cleanSrc = String(src || '').toLowerCase();
  const match = cleanSrc.match(/\.([a-z0-9]+)(?:[?#].*)?$/i);
  return match?.[1] || 'png';
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/i);
  if (!match) return null;
  const mime = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || '';
  let bytes;
  if (isBase64) {
    const binary = atob(payload);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  } else {
    const decoded = decodeURIComponent(payload);
    bytes = new TextEncoder().encode(decoded);
  }
  return { mime, bytes };
}

async function measureImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({
      width: img.naturalWidth || img.width || 1,
      height: img.naturalHeight || img.height || 1
    });
    img.onerror = () => reject(new Error("Impossible de lire les dimensions du visuel."));
    img.src = src;
  });
}

async function loadDocxImageAsset(src) {
  const value = String(src || '').trim();
  if (!value) return null;
  if (value.startsWith('data:')) {
    const decoded = decodeDataUrl(value);
    if (!decoded?.bytes?.length) throw new Error("Le visuel importé est invalide.");
    const dims = await measureImageDimensions(value);
    return {
      bytes: decoded.bytes,
      mime: decoded.mime,
      extension: guessImageExtension(decoded.mime, value),
      ...dims
    };
  }
  const response = await fetch(value, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Le visuel distant est inaccessible (${response.status}).`);
  }
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const objectUrl = URL.createObjectURL(blob);
  try {
    const dims = await measureImageDimensions(objectUrl);
    return {
      bytes,
      mime: blob.type || '',
      extension: guessImageExtension(blob.type, value),
      ...dims
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function scaleDocxImage(width, height, maxWidthPx = 360, maxHeightPx = 280) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const ratio = Math.min(maxWidthPx / safeWidth, maxHeightPx / safeHeight, 1);
  return {
    widthPx: Math.max(1, Math.round(safeWidth * ratio)),
    heightPx: Math.max(1, Math.round(safeHeight * ratio))
  };
}

function nextDocxImageTarget(zip, extension) {
  const files = Object.keys(zip.files || {});
  let index = 1;
  while (files.includes(`word/media/sicod-image-${index}.${extension}`)) index += 1;
  return `word/media/sicod-image-${index}.${extension}`;
}

async function addDocxImageToPackage(zip, src) {
  const asset = await loadDocxImageAsset(src);
  if (!asset) return null;
  const mediaTarget = nextDocxImageTarget(zip, asset.extension);
  zip.file(mediaTarget, asset.bytes);
  const relsDoc = await loadDocxXml(zip, 'word/_rels/document.xml.rels');
  const relRoot = relsDoc.documentElement;
  const existingIds = Array.from(relRoot.getElementsByTagNameNS(REL_NS, 'Relationship'))
    .map((node) => Number(String(node.getAttribute('Id') || '').replace(/^rId/i, '')))
    .filter((value) => Number.isFinite(value));
  const relId = `rId${(existingIds.length ? Math.max(...existingIds) : 0) + 1}`;
  const rel = relsDoc.createElementNS(REL_NS, 'Relationship');
  rel.setAttribute('Id', relId);
  rel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
  rel.setAttribute('Target', mediaTarget.replace(/^word\//, ''));
  relRoot.appendChild(rel);
  saveDocxXml(zip, 'word/_rels/document.xml.rels', relsDoc);
  return {
    relId,
    width: asset.width,
    height: asset.height
  };
}

function clearWordParagraphContent(paragraph) {
  if (!paragraph) return;
  Array.from(paragraph.childNodes).forEach((child) => {
    if (!(child.namespaceURI === WORD_NS && child.localName === 'pPr')) {
      paragraph.removeChild(child);
    }
  });
}

function buildDocxImageRun(ownerDoc, relId, widthPx, heightPx, name = 'Visuel') {
  const widthEmu = Math.max(1, Math.round(widthPx * PX_TO_EMU));
  const heightEmu = Math.max(1, Math.round(heightPx * PX_TO_EMU));
  const docPrId = Date.now() % 1000000;
  return createWordXmlFragment(ownerDoc, `
    <w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="${docPrId}" name="${escapeHtml(name)}"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks noChangeAspect="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="0" name="${escapeHtml(name)}"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${relId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  `);
}

function setParagraphText(paragraph, text) {
  clearWordParagraphContent(paragraph);
  const run = paragraph.ownerDocument.createElementNS(WORD_NS, 'w:r');
  const textNode = paragraph.ownerDocument.createElementNS(WORD_NS, 'w:t');
  textNode.setAttributeNS(XML_NS, 'xml:space', 'preserve');
  textNode.textContent = String(text || '');
  run.appendChild(textNode);
  paragraph.appendChild(run);
}

async function replacePlaceholderWithDocxImage(zip, doc, placeholder, src, options = {}) {
  const paragraph = findWordParagraphs(doc).find((node) => (node.textContent || '').includes(placeholder));
  if (!paragraph) return false;
  const label = options.label || 'Visuel';
  if (!src) {
    setParagraphText(paragraph, options.emptyText || 'Aucun visuel joint');
    return false;
  }
  const imageRef = await addDocxImageToPackage(zip, src);
  if (!imageRef) {
    setParagraphText(paragraph, options.emptyText || 'Aucun visuel joint');
    return false;
  }
  const scaled = scaleDocxImage(imageRef.width, imageRef.height, options.maxWidthPx || 300, options.maxHeightPx || 220);
  clearWordParagraphContent(paragraph);
  paragraph.appendChild(buildDocxImageRun(paragraph.ownerDocument, imageRef.relId, scaled.widthPx, scaled.heightPx, label));
  if (options.caption) {
    const captionParagraph = paragraph.cloneNode(true);
    setParagraphText(captionParagraph, options.caption);
    paragraph.parentNode.insertBefore(captionParagraph, paragraph.nextSibling);
  }
  return true;
}

async function appendDocxImageSection(zip, doc, src, options = {}) {
  if (!src) return false;
  const imageRef = await addDocxImageToPackage(zip, src);
  if (!imageRef) return false;
  const body = findWordBody(doc);
  if (!body) return false;
  const sectPr = body.getElementsByTagNameNS(WORD_NS, 'sectPr')[0];
  const insertBefore = sectPr || null;
  if (options.title) {
    const titleParagraph = createWordXmlFragment(doc, `
      <w:p>
        <w:r><w:t>${escapeHtml(options.title)}</w:t></w:r>
      </w:p>
    `);
    body.insertBefore(titleParagraph, insertBefore);
  }
  const scaled = scaleDocxImage(imageRef.width, imageRef.height, options.maxWidthPx || 420, options.maxHeightPx || 280);
  const imageParagraph = createWordXmlFragment(doc, `
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
    </w:p>
  `);
  imageParagraph.appendChild(buildDocxImageRun(doc, imageRef.relId, scaled.widthPx, scaled.heightPx, options.label || 'Visuel'));
  body.insertBefore(imageParagraph, insertBefore);
  if (options.caption) {
    const captionParagraph = createWordXmlFragment(doc, `
      <w:p>
        <w:pPr><w:jc w:val="center"/></w:pPr>
        <w:r><w:t>${escapeHtml(options.caption)}</w:t></w:r>
      </w:p>
    `);
    body.insertBefore(captionParagraph, insertBefore);
  }
  return true;
}

function buildEventLogDocxRows(eventId) {
  const items = getEventTimelineItems(eventId);
  if (items.length) {
    return items.map((item) => ({
      dateTime: formatDateTimeValueFR(item.date || item.createdAt || ''),
      author: item.author || 'SIRACEDPC',
      title: item.title || '',
      detail: String(item.detail || '').replace(/\s*\n+\s*/g, ' - ').trim()
    }));
  }
  return [{
    dateTime: buildDocumentIssueLine(new Date(), true),
    author: 'SICOD',
    title: 'Aucune entrée de main courante',
    detail: 'Aucune activité enregistrée pour cet événement.'
  }];
}

function buildPSDocxDetails(ps) {
  const parts = [];
  const push = (label, value) => {
    const text = String(value || '').trim();
    if (text) parts.push(`${label} : ${text}`);
  };
  push('Situation générale', ps.situation);
  push('Points d attention', ps.attention ?? ps.points);
  push('Moyens', ps.means ?? ps.moyens);
  push('Mesures prises', ps.measures ?? ps.mesures);
  push('Communication', ps.communication);
  if (ps.transcript) push('Transcription', ps.transcript);
  if (ps.bilan?.notes) push('Compléments bilan', ps.bilan.notes);
  return parts;
}

function buildDutyDocxRows() {
  const rows = state.dutySchedule || [];
  if (rows.length) {
    return rows.map((row) => ({
      start: parseDateLocal(row.start) ? formatDateLocal(parseDateLocal(row.start)) : (row.start || ''),
      end: (() => {
        const displayEnd = row.end || '';
        const formatted = parseDateLocal(displayEnd) ? formatDateLocal(parseDateLocal(displayEnd)) : displayEnd;
        if (row.carryHoliday) {
          return `${formatted}\n(Prolongation jour férié)`;
        }
        return formatted;
      })(),
      agent1: row.agent1?.name || 'Non attribué',
      agent2: row.agent2?.name || 'Non attribué'
    }));
  }
  return [{ start: 'Non défini', end: 'Non défini', agent1: 'Non attribué', agent2: 'Non attribué' }];
}

function buildDutyStatsDocxRows(year) {
  const stats = getDutyStatsData(year);
  const fallbackRow = [{ label: 'Aucune donnée', value: 0 }];
  return {
    stats,
    role1Rows: (stats.a1.length ? stats.a1 : fallbackRow).map((row) => ({ name: row.label, days: row.value })),
    role2Rows: (stats.a2.length ? stats.a2 : fallbackRow).map((row) => ({ name: row.label, days: row.value }))
  };
}

function buildPlanningDocxRows() {
  const items = sortItems(getActiveItems(state.planItems), 'planning', 'approvalDate', 'desc', {
    type: (p) => p.type || '',
    risk: (p) => p.risk || '',
    item: (p) => p.item || '',
    priority: (p) => p.priority || '',
    status: (p) => p.status || '',
    approvalDate: (p) => p.approvalDate || '',
    observation: (p) => p.observation || ''
  });
  if (!items.length) {
    return [{
      type: '—',
      risk: '—',
      item: 'Aucun item de planification',
      priority: '—',
      status: '—',
      approvalDate: '—',
      expiryDate: '—',
      observation: '—'
    }];
  }
  return items.map((item) => ({
    type: item.type || '',
    risk: item.risk || '',
    item: item.item || '',
    priority: item.priority || '',
    status: item.status || '',
    approvalDate: item.approvalDate || '',
    expiryDate: resolvePlanExpiryDate(item) || '',
    observation: item.observation || ''
  }));
}

function buildDirectoryDocxSections() {
  const contacts = getActiveItems(state.contacts);
  if (!contacts.length) {
    return [{
      group: 'Annuaire',
      entities: [{
        name: 'Aucune entité',
        contacts: [{
          fonction: 'Aucun contact',
          identity: '—',
          tel1: '—',
          tel2: '',
          email1: '—',
          email2: ''
        }]
      }]
    }];
  }
  const groupMap = new Map();
  contacts.forEach((contact) => {
    const groupName = String(contact.group || 'Autres').trim() || 'Autres';
    const entityName = String(contact.entity || 'Sans entité').trim() || 'Sans entité';
    if (!groupMap.has(groupName)) groupMap.set(groupName, new Map());
    const entityMap = groupMap.get(groupName);
    if (!entityMap.has(entityName)) entityMap.set(entityName, []);
    entityMap.get(entityName).push({
      fonction: contact.function || '',
      identity: formatContactFullName(contact),
      tel1: contact.phone1 || '',
      tel2: contact.phone2 || '',
      email1: contact.email1 || '',
      email2: contact.email2 || ''
    });
  });
  return Array.from(groupMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
    .map(([group, entities]) => ({
      group,
      entities: Array.from(entities.entries())
        .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
        .map(([name, rows]) => ({
          name,
          contacts: rows.sort((a, b) =>
            (a.fonction || '').localeCompare(b.fonction || '', 'fr')
            || (a.identity || '').localeCompare(b.identity || '', 'fr'))
        }))
    }));
}

async function exportDocxBlob(zip, fileName) {
  const blob = await zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME });
  downloadBlob(blob, fileName);
}

/** Retourne la source logo courante (personnalisée ou défaut) */
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

function buildDocumentIssueLine(value = new Date(), includeTime = false) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Marseille, le';
  const datePart = date.toLocaleDateString('fr-FR');
  if (!includeTime) return `Marseille, le ${datePart}`;
  const timePart = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `Marseille, le ${datePart} à ${timePart}`;
}

function shiftIsoDateByYears(isoDate, years = 4) {
  const raw = String(isoDate || '').trim();
  if (!raw) return '';
  const date = parseDateLocal(raw);
  if (!date) return '';
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + Number(years || 0));
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
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

function resolvePlanExpiryDate(item) {
  if (!item) return '';
  if (item.expiryDate) return item.expiryDate;
  const years = getPlanExpiryYearsForType(item.type) || 4;
  return shiftIsoDateByYears(item.approvalDate, years);
}

function refreshPlanExpiryDatesFromSettings() {
  getActiveItems(state.planItems).forEach((item) => {
    if (!item) return;
    const approvalDate = String(item.approvalDate || '').trim();
    if (!approvalDate) {
      item.expiryDate = '';
      return;
    }
    const years = getPlanExpiryYearsForType(item.type) || 4;
    item.expiryDate = shiftIsoDateByYears(approvalDate, years);
  });
}

function syncPlanExpiryFromApproval(force = false) {
  const approvalEl = document.getElementById('planApproval');
  const expiryEl = document.getElementById('planExpiry');
  const typeEl = document.getElementById('planType');
  if (!approvalEl || !expiryEl) return;
  if (!approvalEl.value) {
    if (force) expiryEl.value = '';
    return;
  }
  if (force || !expiryEl.value) {
    const years = getPlanExpiryYearsForType(typeEl?.value || '') || 4;
    expiryEl.value = shiftIsoDateByYears(approvalEl.value, years);
  }
}

function applyPlanExpiryRules() {
  let changed = false;
  getActiveItems(state.planItems).forEach(item => {
    if (normalizePlanStatus(item.status) !== 'a jour') return;
    const limit = parseDateLocal(resolvePlanExpiryDate(item));
    if (!limit) return;
    if (new Date() > limit) {
      item.status = 'A programmer';
      changed = true;
    }
  });
  if (changed) persist();
}

function isPlanExpired(item) {
  const limit = parseDateLocal(resolvePlanExpiryDate(item));
  if (!limit) return false;
  return new Date() > limit;
}

function getPSSignatureConfig() {
  return {
    mode: state.settings.eventUnifiedSignatureMode || state.settings.eventSignatureMode || state.settings.psSignatureMode || 'delegation',
    name: state.settings.eventUnifiedSignatureName || state.settings.eventSignatureName || state.settings.psSignatureName || 'Nicolas HAUPTMANN',
    role: state.settings.eventUnifiedSignatureRole || state.settings.eventSignatureRole || state.settings.psSignatureRole || 'le directeur de cabinet'
  };
}
function getEventSignatureConfig() {
  return {
    mode: state.settings.eventUnifiedSignatureMode || state.settings.eventSignatureMode || state.settings.psSignatureMode || 'delegation',
    name: state.settings.eventUnifiedSignatureName || state.settings.eventSignatureName || state.settings.psSignatureName || 'Nicolas HAUPTMANN',
    role: state.settings.eventUnifiedSignatureRole || state.settings.eventSignatureRole || state.settings.psSignatureRole || 'le directeur de cabinet'
  };
}
function shouldApplyPdfSignature(context) {
  return false;
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
    ? ['Pour le préfet, par délégation', sig.role || '', sig.name || ''].filter(Boolean)
    : ['Le préfet,', sig.name || ''].filter(Boolean);
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
    return `<div class="ps-signature"><div class="ps-signature-box"><div class="sig-line1">Pour le préfet, par délégation</div><div class="sig-line2">${esc(sig.role || '')}</div><div class="sig-line2">${esc(sig.name || '')}</div></div></div>`;
  }
  return `<div class="ps-signature"><div class="ps-signature-box"><div class="sig-line1">Le préfet</div><div class="sig-line2">${esc(sig.name || '')}</div></div></div>`;
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

/** Applique le thème clair/sombre */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
}

/** Bascule le thème */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || state.settings.theme || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  state.settings.theme = next;
  applyTheme(next);
  const el = document.getElementById('settingTheme');
  if (el) el.value = next;
  persist();
}

/** Génère une URL favicon à partir d'une URL de site */
function guessFavicon(url) {
  try { return new URL(url).origin + '/favicon.ico'; } catch (e) { return ''; }
}

// Construit le HTML du cartouche PS
function psCartouche(ps, event) {
  const dateStr = ps.updatedAt ? new Date(ps.updatedAt).toLocaleString('fr-FR', {dateStyle:'short',timeStyle:'short'}) : '—';
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

function buildA4HtmlTemplate(orientation, titleHtml, subtitleHtml, bodyHtml, options = {}) {
  const className = options.className ? ` ${options.className}` : '';
  const logo = options.logo === false ? '' : '<img class="sicod-page-logo" src="{{logo}}" alt="">';
  const header = options.header === false ? '' : `
      <header class="sicod-page-header">
        <div class="sicod-page-logo-box">${logo}</div>
        <div class="sicod-page-title"><h2>${titleHtml}</h2><p>${subtitleHtml || ''}</p></div>
        <div class="sicod-page-logo-box"></div>
      </header>`;
  const page = `
    <article class="sicod-page sicod-page--${orientation}${className}">
      ${header}
      <main class="sicod-page-body">
        ${bodyHtml}
      </main>
    </article>
  `;
  return buildCompleteHtmlTemplateDocument(titleHtml, orientation, page);
}

function buildCompleteHtmlTemplateDocument(titleHtml, orientation, bodyHtml) {
  const safeTitle = String(titleHtml || 'Export SICOD').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => key);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <style>
    @page{size:${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};margin:0}
    html,body{margin:0;padding:0;background:#ffffff;color:#161616}
    body{font-family:Marianne,"Segoe UI",Arial,sans-serif}
    .sicod-page{width:${orientation === 'landscape' ? '297mm' : '210mm'};min-height:${orientation === 'landscape' ? '210mm' : '297mm'};background:#fff;color:#161616;box-sizing:border-box;padding:9mm 11mm 12mm;font-family:Marianne,"Segoe UI",Arial,sans-serif;position:relative;overflow:visible}
    .sicod-page--portrait{width:210mm;min-height:297mm}
    .sicod-page--landscape{width:297mm;min-height:210mm}
    .sicod-page-header{display:grid;grid-template-columns:30mm 1fr 30mm;gap:7mm;align-items:start;margin-bottom:6mm;padding-bottom:3mm;border-bottom:1.2px solid #000091}
    .sicod-page-logo{width:27mm;max-height:20mm;object-fit:contain}
    .sicod-page-title{text-align:center}
    .sicod-page-title h2{margin:0;font-size:22px;line-height:1.18;text-transform:uppercase;color:#161616;font-weight:800}
    .sicod-page-title p{margin:3mm 0 0;font-size:14px;line-height:1.35;color:#3a3a3a}
    .sicod-page-body{width:100%}
    .cmd-contact-block{font-size:12px;line-height:1.4;margin:0 0 5mm}
    .sicod-page .table{width:100%;border-collapse:collapse}
    .sicod-page .table th,.sicod-page .table td{border:1px solid #cfcfd8;padding:2.4mm 2.2mm;font-size:11.5px;line-height:1.35;vertical-align:top}
    .sicod-page .table th{background:#f5f5fe;color:#000091;font-weight:800}
    .sicod-page .ps-cartouche{width:fit-content;max-width:100%;margin:0 auto 5mm;border:1px solid #ddd}
    .sicod-page .ps-section-title,.sicod-page .focus-label,.sicod-page .block-title{background:#000091;color:#fff;font-weight:800;text-transform:uppercase;padding:2.4mm 2.8mm;font-size:12px;letter-spacing:.01em}
    .sicod-page .ps-detail-table{width:100%;border-collapse:collapse;table-layout:fixed}
    .sicod-page .ps-detail-table td{border:1px solid #ddd;vertical-align:top;padding:0}
    .sicod-page .ps-content,.sicod-page .focus-body,.sicod-page .block-body{padding:3.5mm;font-size:12px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
    .sicod-page .focus-grid{display:grid;grid-template-columns:1.05fr 2.35fr 1.1fr;border:1px solid #cfcfd8;min-height:145mm}
    .sicod-page .focus-col,.sicod-page .focus-center{display:grid;min-height:145mm}
    .sicod-page .focus-col{grid-template-rows:1fr 1.25fr;border-right:1px solid #ddd}
    .sicod-page .focus-right{border-left:1px solid #ddd;border-right:none}
    .sicod-page .focus-center{grid-template-rows:1fr 1.15fr .85fr}
    .sicod-page .focus-box{border-bottom:1px solid #ddd;display:flex;flex-direction:column;min-height:0}
    .sicod-page .focus-box:last-child{border-bottom:0}
    .sicod-page .focus-map{display:flex;align-items:center;justify-content:center;padding:2mm;min-height:42mm;overflow:hidden}
    .sicod-page .focus-map img,.sicod-page .ps-content img{max-width:100%;max-height:100%;object-fit:contain}
    .sicod-page .ps-signature{margin-top:8mm;display:flex;justify-content:flex-end}
    .sicod-page .ps-signature-box{min-width:55mm;max-width:78mm;text-align:left;font-size:12px;line-height:1.45}
    .sicod-page .exercise-banner{display:none;text-align:center;color:#e1000f;font-weight:700;letter-spacing:.08em;margin-bottom:5mm}
    .sicod-page.exercise .exercise-banner{display:block}
    .sicod-page .cmd-urgent{margin:5mm 0 0;padding:3mm;background:#f5f5fe;font-weight:800;color:#000091;text-transform:uppercase;font-size:13px}
    .sicod-page .cmd-autotext{margin:5mm 0;font-size:12.5px;line-height:1.55;white-space:pre-wrap}
    .sicod-page .meta-line{width:100%;max-width:100%;margin:0 0 5mm;border:0}
    .sicod-page .block{margin:0 0 5mm}
    .sicod-page--docx{display:flex;flex-direction:column}
    .sicod-page--docx .sicod-page-body{flex:1;display:flex;flex-direction:column}
    .sicod-page--docx .sicod-docx-shell{display:flex;flex-direction:column;gap:4mm;min-height:100%}
    .sicod-page--docx .sicod-letterhead{display:flex;align-items:flex-start;justify-content:space-between;gap:8mm}
    .sicod-page--docx .sicod-docx-brand{display:flex;align-items:flex-start;gap:4mm}
    .sicod-page--docx .sicod-docx-brand img{width:20mm;max-height:16mm;object-fit:contain}
    .sicod-page--docx .sicod-docx-brand-text{font-size:10.5px;line-height:1.2;font-weight:700;text-transform:uppercase;color:#161616}
    .sicod-page--docx .sicod-document-date{margin-left:auto;text-align:right;font-size:11.5px;line-height:1.35}
    .sicod-page--docx .sicod-document-title{margin:0;text-align:center;font-size:21px;line-height:1.2;font-weight:800;text-transform:uppercase;color:#161616}
    .sicod-page--docx .sicod-document-subtitle{margin:-1mm 0 0;text-align:center;font-size:14px;line-height:1.35;font-weight:700;color:#161616}
    .sicod-page--docx .sicod-document-intro{margin:0;font-size:12px;line-height:1.55;color:#161616}
    .sicod-page--docx .sicod-document-footer{margin-top:auto;padding-top:3mm;border-top:1px solid #7f7f7f;font-size:9.5px;line-height:1.35;color:#4b5563}
    .sicod-page--docx .sicod-document-footer div{text-align:left}
    .sicod-page--docx .sicod-docx-signature{margin-top:3mm;display:flex;justify-content:flex-end}
    .sicod-page--docx .table th,.sicod-page--docx .table td{border-color:#8d8d8d}
    .sicod-page--docx .table th{background:#fff;color:#161616;font-weight:800}
    .sicod-page--docx .block-title{background:#fff;color:#161616;border:1px solid #8d8d8d;padding:2.4mm 2.8mm;font-size:12px}
    .sicod-page--docx .block-body{border:1px solid #8d8d8d;border-top:0}
    .sicod-page--docx .sicod-reflex-title{margin:0;text-align:center;font-size:18px;font-weight:800;text-transform:uppercase}
    .sicod-page--docx .sicod-reflex-subtitle{margin:0;text-align:center;font-size:15px;font-weight:700}
    .sicod-page--docx .sicod-reflex-section h3{margin:0 0 2mm;font-size:13px;text-transform:uppercase}
    .sicod-page--docx .sicod-reflex-section ul{margin:0;padding-left:1.1rem}
    .sicod-page--docx .sicod-reflex-section li + li{margin-top:1.5mm}
    .sicod-export-page-break{break-before:page;page-break-before:always}
    .sicod-keep-together{break-inside:avoid;page-break-inside:avoid}
  </style>
</head>
<body>
${bodyHtml.trim()}
</body>
</html>`;
}

const STABLE_HTML_TEMPLATE_DEFAULTS = {
  point_situation_detail: buildA4HtmlTemplate('portrait', '{{title}}', '{{subtitle}}', `
      <div class="sicod-docx-shell">
        <div class="sicod-letterhead">
          <div class="sicod-docx-brand">
            <img src="{{logo}}" alt="">
            <div class="sicod-docx-brand-text">CABINET<br>SIRACEDPC</div>
          </div>
        </div>
        <h1 class="sicod-document-title">{{title}}</h1>
        <p class="sicod-document-subtitle">{{subtitle}}</p>
        {{cartouche}}
        <table class="ps-detail-table">
          <tr><td style="width:27%"><div class="ps-section-title">Situation générale</div></td><td><div class="ps-content">{{situation}}</div></td></tr>
          <tr><td><div class="ps-section-title">Bilan</div></td><td><div class="ps-content">{{bilan}}</div></td></tr>
          <tr><td><div class="ps-section-title">Moyens engagés</div></td><td><div class="ps-content">{{means}}</div></td></tr>
          <tr><td><div class="ps-section-title">Mesures prises</div></td><td><div class="ps-content">{{measures}}</div></td></tr>
          <tr><td><div class="ps-section-title">Points d'attention</div></td><td><div class="ps-content">{{attention}}</div></td></tr>
          <tr><td><div class="ps-section-title">Communication</div></td><td><div class="ps-content">{{communication}}</div></td></tr>
          {{image_row}}
          {{sources_row}}
        </table>
        <div class="sicod-docx-signature">{{signature}}</div>
        <footer class="sicod-document-footer"><div>Place Félix Baret – CS 80001 – 13282 Marseille Cedex 06</div><div>Téléphone : 04 84 35 40 00</div><div>www.bouches-du-rhone.gouv.fr</div></footer>
      </div>
  `, { header: false, className: 'sicod-page--docx sicod-template--docx-ps-detail' }),
  point_situation_focus: buildA4HtmlTemplate('landscape', '{{title}}', '{{subtitle}}', `
      <div class="sicod-docx-shell">
        <div class="sicod-letterhead">
          <div class="sicod-docx-brand">
            <img src="{{logo}}" alt="">
            <div class="sicod-docx-brand-text">CABINET<br>SIRACEDPC</div>
          </div>
        </div>
        <h1 class="sicod-document-title">{{title}}</h1>
        <p class="sicod-document-subtitle">{{subtitle}}</p>
        {{cartouche}}
        <div class="focus-grid">
          <div class="focus-col">
            <div class="focus-box"><div class="focus-label">Bilan</div><div class="focus-body">{{bilan}}</div></div>
            <div class="focus-box"><div class="focus-label">Moyens</div><div class="focus-body">{{means}}</div></div>
          </div>
          <div class="focus-center">
            <div class="focus-box"><div class="focus-label">Situation générale</div><div class="focus-body">{{situation}}</div></div>
            <div class="focus-box"><div class="focus-label">Cartographie</div><div class="focus-map">{{image}}</div></div>
            <div class="focus-box"><div class="focus-label">Communication</div><div class="focus-body">{{communication}}</div></div>
          </div>
          <div class="focus-col focus-right">
            <div class="focus-box"><div class="focus-label">Points d'attention</div><div class="focus-body">{{attention}}</div></div>
            <div class="focus-box"><div class="focus-label">Mesures prises</div><div class="focus-body">{{measures}}</div></div>
          </div>
        </div>
        <div class="sicod-docx-signature">{{signature}}</div>
        <footer class="sicod-document-footer"><div>Place Félix Baret – CS 80001 – 13282 Marseille Cedex 06</div><div>Téléphone : 04 84 35 40 00</div><div>www.bouches-du-rhone.gouv.fr</div></footer>
      </div>
  `, { header: false, className: 'sicod-page--docx sicod-template--docx-ps-focus' }),
  command_message: buildA4HtmlTemplate('portrait', '{{typeLabel}}', '{{eventTitle}}', `
      <div class="exercise-banner" style="{{exerciseDisplay}}">EXERCICE - EXERCICE - EXERCICE</div>
      <div class="cmd-contact-block">
        <div><strong>SIRACEDPC</strong></div>
        <div>Téléphone : {{contactPhone}}</div>
        <div>Télécopie : {{contactFax}}</div>
        <div>Courriel : {{contactEmail}}</div>
        <div>Audio-conf. : {{contactAudioConf}}</div>
      </div>
      <div class="meta-line"><table class="table"><tbody><tr><th>Date</th><th>Heure</th><th>Site / lieu</th></tr><tr><td>{{date}}</td><td>{{time}}</td><td>{{site}}</td></tr></tbody></table></div>
      <div class="cmd-urgent">MESSAGE URGENT</div>
      <p class="cmd-autotext">{{autoText}}</p>
      <div class="meta-line"><table class="table"><thead><tr><th>Dispositif de référence</th><th>Heure d'activation</th><th>Localisation du PCO</th></tr></thead><tbody><tr><td>{{reference}}</td><td>{{activation}}</td><td>{{pcoLocation}}</td></tr></tbody></table></div>
      <table class="table"><tbody>
        <tr><th style="width:78%">Mesures</th><th>Valeur</th></tr>
        {{measuresRows}}
      </tbody></table>
      <div style="margin-top:1rem"><table class="table"><thead><tr><th>Services / entités</th><th>COD</th><th>PCO</th></tr></thead><tbody>{{servicesRows}}</tbody></table></div>
      <div style="margin-top:1.25rem;display:flex;justify-content:flex-end;text-align:right">{{signature}}</div>
      <div style="margin-top:.75rem;text-align:right"><strong>{{originalSigned}}</strong></div>
      <div class="exercise-banner" style="margin-top:1rem;{{exerciseDisplay}}">EXERCICE - EXERCICE - EXERCICE</div>
  `, { className: 'sicod-page--command {{exerciseClass}}' }),
  main_courante: buildA4HtmlTemplate('portrait', '{{eventTitle}}', '{{eventMeta}}', `
      <div class="sicod-docx-shell">
        <div class="sicod-letterhead">
          <div class="sicod-docx-brand">
            <img src="{{logo}}" alt="">
            <div class="sicod-docx-brand-text">CABINET<br>SIRACEDPC</div>
          </div>
          <div class="sicod-document-date">{{issueLine}}</div>
        </div>
        <h1 class="sicod-document-title">MAIN COURANTE</h1>
        <p class="sicod-document-subtitle">{{eventTitle}}</p>
        <p class="sicod-document-intro">{{eventMeta}}</p>
        <table class="table">
        <thead><tr><th style="width:13rem">Date / heure</th><th style="width:10rem">Auteur</th><th>Entrée</th></tr></thead>
        <tbody>{{entriesRows}}</tbody>
        </table>
        <div class="sicod-docx-signature">{{signature}}</div>
        <footer class="sicod-document-footer"><div>Place Félix Baret – CS 80001 – 13282 Marseille Cedex 06</div><div>Téléphone : 04 84 35 40 00</div><div>www.bouches-du-rhone.gouv.fr</div></footer>
      </div>
  `, { header: false, className: 'sicod-page--docx sicod-template--docx-main-log' }),
  directory: buildA4HtmlTemplate('landscape', 'ANNUAIRE ORSEC DEPARTEMENTAL', '{{subtitle}}', `
      {{directory}}
  `, { className: 'sicod-page--directory' }),
  planning_follow_up: buildA4HtmlTemplate('landscape', 'Tableau de suivi de la planification ORSEC', '{{summary}}', `
      {{table}}
  `, { className: 'sicod-page--planning' }),
  planning_statistics: buildA4HtmlTemplate('portrait', 'STATISTIQUES DE PLANIFICATION', '{{summary}}', `
      {{charts}}
  `, { className: 'sicod-page--statistics' }),
  duty_schedule: buildA4HtmlTemplate('portrait', 'CALENDRIER DE MISES SOUS ASTREINTE QUALIFIÉES', '{{period}}', `
      <div class="sicod-docx-shell">
        <div class="sicod-letterhead">
          <div class="sicod-docx-brand">
            <img src="{{logo}}" alt="">
            <div class="sicod-docx-brand-text">CABINET<br>SIRACEDPC</div>
          </div>
          <div class="sicod-document-date">{{issueLine}}</div>
        </div>
        <h1 class="sicod-document-title">CALENDRIER DE MISES SOUS ASTREINTE QUALIFIÉES</h1>
        <p class="sicod-document-subtitle">DE DÉFENSE ET DE SÉCURITÉ CIVILES</p>
        <p class="sicod-document-intro">{{intro}}</p>
        {{table}}
        <div class="sicod-docx-signature">{{signature}}</div>
        <footer class="sicod-document-footer"><div>Place Félix Baret – CS 80001 – 13282 Marseille Cedex 06</div><div>Téléphone : 04 84 35 40 00</div><div>www.bouches-du-rhone.gouv.fr</div></footer>
      </div>
  `, { header: false, className: 'sicod-page--docx sicod-template--docx-duty' }),
  duty_statistics: buildA4HtmlTemplate('portrait', "STATISTIQUES D'ASTREINTES", '{{summary}}', `
      <div class="sicod-docx-shell">
        <div class="sicod-letterhead">
          <div class="sicod-docx-brand">
            <img src="{{logo}}" alt="">
            <div class="sicod-docx-brand-text">CABINET<br>SIRACEDPC</div>
          </div>
          <div class="sicod-document-date">{{issueLine}}</div>
        </div>
        <h1 class="sicod-document-title">STATISTIQUES ASTREINTES</h1>
        <p class="sicod-document-subtitle">Année {{documentYear}}</p>
        {{charts}}
        <div class="sicod-docx-signature">{{signature}}</div>
        <footer class="sicod-document-footer"><div>Place Félix Baret – CS 80001 – 13282 Marseille Cedex 06</div><div>Téléphone : 04 84 35 40 00</div><div>www.bouches-du-rhone.gouv.fr</div></footer>
      </div>
  `, { header: false, className: 'sicod-page--docx sicod-template--docx-duty-stats' }),
  reflex_sheet: buildA4HtmlTemplate('portrait', 'FICHE REFLEXE', '{{header}}', `
      <div class="sicod-docx-shell">
        <div class="sicod-letterhead">
          <div class="sicod-docx-brand">
            <img src="{{logo}}" alt="">
            <div class="sicod-docx-brand-text">CABINET<br>SIRACEDPC</div>
          </div>
          <div class="sicod-document-date">{{issueLine}}</div>
        </div>
        <h1 class="sicod-reflex-title">FICHE REFLEXE</h1>
        {{sections}}
        <footer class="sicod-document-footer"><div>Place Félix Baret – CS 80001 – 13282 Marseille Cedex 06</div><div>Téléphone : 04 84 35 40 00</div><div>www.bouches-du-rhone.gouv.fr</div></footer>
      </div>
  `, { header: false, className: 'sicod-page--docx sicod-template--docx-reflex' })
};

const HTML_TEMPLATE_ORIENTATIONS = {
  point_situation_focus: 'landscape',
  directory: 'landscape',
  planning_follow_up: 'landscape'
};

function getHtmlTemplateOrientation(key) {
  return HTML_TEMPLATE_ORIENTATIONS[key] || 'portrait';
}

function ensureOperationalHtmlTemplates() {
  if (!window.SICODPdfTemplates?.setHtmlTemplate) return;
  const docxMarkers = {
    point_situation_detail: 'sicod-template--docx-ps-detail',
    point_situation_focus: 'sicod-template--docx-ps-focus',
    main_courante: 'sicod-template--docx-main-log',
    duty_schedule: 'sicod-template--docx-duty',
    duty_statistics: 'sicod-template--docx-duty-stats',
    reflex_sheet: 'sicod-template--docx-reflex'
  };
  Object.entries(STABLE_HTML_TEMPLATE_DEFAULTS).forEach(([key, html]) => {
    const existing = window.SICODPdfTemplates.getHtmlTemplate(state, key);
    const source = String(existing?.html || '');
    const expectedMarker = docxMarkers[key];
    if (!source || !source.includes('sicod-page') || !source.includes('font-size:22px') || !templateLooksLikeDocument(source) || /Bloc 1|Bloc 2|<header>\s*<h1>/.test(source) || (expectedMarker && !source.includes(expectedMarker))) {
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

function normalizeHtmlTemplateSourceForStorage(key, html) {
  const source = String(html || '').trim();
  if (!source) return STABLE_HTML_TEMPLATE_DEFAULTS[key] || '';
  if (templateLooksLikeDocument(source)) return source;
  const title = window.SICODPdfTemplates?.getHtmlTemplate?.(state, key)?.label || key || 'Export SICOD';
  return buildCompleteHtmlTemplateDocument(title, getHtmlTemplateOrientation(key), source);
}

function getStoredHtmlTemplateRaw(key) {
  ensureOperationalHtmlTemplates();
  const template = window.SICODPdfTemplates?.getHtmlTemplate(state, key);
  const html = String(template?.html || STABLE_HTML_TEMPLATE_DEFAULTS[key] || '');
  return normalizeHtmlTemplateSourceForStorage(key, html);
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
    .template-export-stage .document-page{width:${pageWidth};min-height:${pageHeight};margin:0 auto;background:#ffffff;box-shadow:none;box-sizing:border-box;overflow:visible}
    .sicod-page{width:${pageWidth};min-height:${pageHeight};background:#fff;color:#161616;box-sizing:border-box;padding:9mm 11mm 12mm;font-family:Marianne,"Segoe UI",Arial,sans-serif;position:relative;overflow:visible}
    .sicod-page--portrait{width:210mm;min-height:297mm}
    .sicod-page--landscape{width:297mm;min-height:210mm}
    .sicod-page-header{display:grid;grid-template-columns:30mm 1fr 30mm;gap:7mm;align-items:start;margin-bottom:6mm;padding-bottom:3mm;border-bottom:1.2px solid #000091}
    .sicod-page-logo{width:27mm;max-height:20mm;object-fit:contain}
    .sicod-page-title{text-align:center}
    .sicod-page-title h2{margin:0;font-size:22px;line-height:1.18;text-transform:uppercase;color:#161616;font-weight:800}
    .sicod-page-title p{margin:3mm 0 0;font-size:14px;line-height:1.35;color:#3a3a3a}
    .sicod-page-body{width:100%}
    .cmd-contact-block{font-size:12px;line-height:1.4;margin:0 0 5mm}
    .sicod-page .ps-cartouche{width:fit-content;max-width:100%;margin:0 auto 5mm;border:1px solid #ddd}
    .sicod-page .table{width:100%;border-collapse:collapse}
    .sicod-page .table th,.sicod-page .table td{border:1px solid #cfcfd8;padding:2.4mm 2.2mm;font-size:11.5px;line-height:1.35;vertical-align:top}
    .sicod-page .table th{background:#f5f5fe;color:#000091;font-weight:800}
    .sicod-page .ps-section-title,.sicod-page .focus-label,.sicod-page .block-title{background:#000091;color:#fff;font-weight:800;text-transform:uppercase;padding:2.4mm 2.8mm;font-size:12px;letter-spacing:.01em}
    .sicod-page .ps-detail-table{width:100%;border-collapse:collapse;table-layout:fixed}
    .sicod-page .ps-detail-table td{border:1px solid #ddd;vertical-align:top;padding:0}
    .sicod-page .ps-content,.sicod-page .focus-body,.sicod-page .block-body{padding:3.5mm;font-size:12px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
    .sicod-page .focus-grid{display:grid;grid-template-columns:1.05fr 2.35fr 1.1fr;border:1px solid #ddd;min-height:145mm}
    .sicod-page .focus-col,.sicod-page .focus-center{display:grid;min-height:145mm}
    .sicod-page .focus-col{grid-template-rows:1fr 1.25fr;border-right:1px solid #ddd}
    .sicod-page .focus-right{border-left:1px solid #ddd;border-right:none}
    .sicod-page .focus-center{grid-template-rows:1fr 1.15fr .85fr}
    .sicod-page .focus-box{border-bottom:1px solid #ddd;display:flex;flex-direction:column;min-height:0}
    .sicod-page .focus-box:last-child{border-bottom:0}
    .sicod-page .focus-map{display:flex;align-items:center;justify-content:center;padding:2mm;min-height:42mm;overflow:hidden}
    .sicod-page .focus-map img,.sicod-page .ps-content img{max-width:100%;max-height:100%;object-fit:contain}
    .sicod-page .ps-signature{margin-top:8mm;display:flex;justify-content:flex-end}
    .sicod-page .ps-signature-box{min-width:55mm;max-width:78mm;text-align:left;font-size:12px;line-height:1.45}
    .sicod-page .exercise-banner{display:none;text-align:center;color:#e1000f;font-weight:700;letter-spacing:.08em;margin-bottom:5mm}
    .sicod-page.exercise .exercise-banner{display:block}
    .sicod-page .cmd-urgent{margin:5mm 0 0;padding:3mm;background:#f5f5fe;font-weight:800;color:#000091;text-transform:uppercase;font-size:13px}
    .sicod-page .cmd-autotext{margin:5mm 0;font-size:12.5px;line-height:1.55;white-space:pre-wrap}
    .sicod-page .meta-line{width:100%;max-width:100%;margin:0 0 5mm;border:0}
    .sicod-page .block{margin:0 0 5mm}
    .sicod-page--docx{display:flex;flex-direction:column}
    .sicod-page--docx .sicod-page-body{flex:1;display:flex;flex-direction:column}
    .sicod-page--docx .sicod-docx-shell{display:flex;flex-direction:column;gap:4mm;min-height:100%}
    .sicod-page--docx .sicod-letterhead{display:flex;align-items:flex-start;justify-content:space-between;gap:8mm}
    .sicod-page--docx .sicod-docx-brand{display:flex;align-items:flex-start;gap:4mm}
    .sicod-page--docx .sicod-docx-brand img{width:20mm;max-height:16mm;object-fit:contain}
    .sicod-page--docx .sicod-docx-brand-text{font-size:10.5px;line-height:1.2;font-weight:700;text-transform:uppercase;color:#161616}
    .sicod-page--docx .sicod-document-date{margin-left:auto;text-align:right;font-size:11.5px;line-height:1.35}
    .sicod-page--docx .sicod-document-title{margin:0;text-align:center;font-size:21px;line-height:1.2;font-weight:800;text-transform:uppercase;color:#161616}
    .sicod-page--docx .sicod-document-subtitle{margin:-1mm 0 0;text-align:center;font-size:14px;line-height:1.35;font-weight:700;color:#161616}
    .sicod-page--docx .sicod-document-intro{margin:0;font-size:12px;line-height:1.55;color:#161616}
    .sicod-page--docx .sicod-document-footer{margin-top:auto;padding-top:3mm;border-top:1px solid #7f7f7f;font-size:9.5px;line-height:1.35;color:#4b5563}
    .sicod-page--docx .sicod-document-footer div{text-align:left}
    .sicod-page--docx .sicod-docx-signature{margin-top:3mm;display:flex;justify-content:flex-end}
    .sicod-page--docx .table th,.sicod-page--docx .table td{border-color:#8d8d8d}
    .sicod-page--docx .table th{background:#fff;color:#161616;font-weight:800}
    .sicod-page--docx .block-title{background:#fff;color:#161616;border:1px solid #8d8d8d;padding:2.4mm 2.8mm;font-size:12px}
    .sicod-page--docx .block-body{border:1px solid #8d8d8d;border-top:0}
    .sicod-page--docx .sicod-reflex-title{margin:0;text-align:center;font-size:18px;font-weight:800;text-transform:uppercase}
    .sicod-page--docx .sicod-reflex-subtitle{margin:0;text-align:center;font-size:15px;font-weight:700}
    .sicod-page--docx .sicod-reflex-section h3{margin:0 0 2mm;font-size:13px;text-transform:uppercase}
    .sicod-page--docx .sicod-reflex-section ul{margin:0;padding-left:1.1rem}
    .sicod-page--docx .sicod-reflex-section li + li{margin-top:1.5mm}
    .sicod-export-page-break{break-before:page;page-break-before:always}
    .sicod-keep-together{break-inside:avoid;page-break-inside:avoid}
    .template-export-stage .document-page>.ps-sheet,
    .template-export-stage .document-page>.command-sheet{width:100%;min-height:${pageHeight};max-width:none!important;box-sizing:border-box;border:0}
    @media print{.template-export-stage{padding:0;background:#ffffff}}
  </style>`;
  if (templateLooksLikeDocument(raw)) {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><base href="${esc(baseHref)}">${head}${shellStyle}</head><body><div class="template-export-stage"><div class="document-page">${body}</div></div></body></html>`;
  }
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(options.title || key)}</title><base href="${esc(baseHref)}"><link rel="stylesheet" href="${esc(stylesheetHref)}">${shellStyle}</head><body><div class="template-export-stage"><div class="document-page">${body}</div></div></body></html>`;
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
  if (!window.jspdf?.jsPDF) {
    showToast("Le moteur d'export PDF n'est pas disponible.", 'error');
    return;
  }
  const isLandscape = options.orientation === 'landscape';
  const pageViewport = isLandscape
    ? { width: 1588, height: 1123 }
    : { width: 1123, height: 1588 };
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${pageViewport.width}px`;
  iframe.style.height = `${pageViewport.height}px`;
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = '0';
  iframe.srcdoc = buildTemplateHtmlDocument(key, tokens || {}, options);
  document.body.appendChild(iframe);
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Le rendu du document a expiré.')), 12000);
      iframe.onload = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDocument) throw new Error("Le document HTML n'a pas pu être initialisé.");
    await waitForFrameAssets(frameDocument);
    const target = frameDocument.querySelector('.sicod-page') || frameDocument.querySelector('.document-page') || frameDocument.body;
    const doc = new window.jspdf.jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: isLandscape ? 'landscape' : 'portrait'
    });
    renderTemplateDomToPdfPositioned(doc, target, { orientation: isLandscape ? 'landscape' : 'portrait' });
    doc.save(fileName || `${slugify(options.title || key || 'document')}.pdf`);
  } catch (error) {
    showToast(`Export PDF impossible : ${error.message || String(error)}`, 'error');
  } finally {
    iframe.remove();
  }
}

function cssColorToRgb(value, fallback = [22, 22, 22]) {
  const raw = String(value || '').trim();
  const rgb = raw.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const hex = raw.match(/^#([0-9a-f]{6})$/i);
  if (hex) return hexToRgb(hex[1], fallback);
  return fallback;
}

function setTemplatePdfFont(doc, style = 'normal') {
  const fontList = doc.getFontList?.() || {};
  const family = fontList.Marianne ? 'Marianne' : (fontList.marianne ? 'marianne' : 'helvetica');
  try {
    doc.setFont(family, style);
  } catch {
    doc.setFont('helvetica', style);
  }
}

function firstMeaningfulText(element) {
  return String(element?.innerText || element?.textContent || '').replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').trim();
}

function getDirectText(element) {
  let out = '';
  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) out += node.textContent || '';
  });
  return out.trim();
}

function renderTemplateDomToPdfPositioned(doc, root, opts = {}) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const rootRect = root.getBoundingClientRect();
  const scale = pageW / Math.max(1, rootRect.width);
  const pageHeightPx = pageH / scale;
  const borderFallback = [221, 221, 221];
  const filledPages = new Set();

  const ensurePage = (pageIndex) => {
    while (doc.getNumberOfPages() <= pageIndex) {
      doc.addPage();
    }
    doc.setPage(pageIndex + 1);
    if (!filledPages.has(pageIndex)) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(255, 255, 255);
      doc.rect(0, 0, pageW, pageH, 'F');
      filledPages.add(pageIndex);
    }
  };

  const rawYForElement = (element) => (element.getBoundingClientRect().top - rootRect.top) * scale;
  const explicitBreaks = Array.from(root.querySelectorAll('.sicod-export-page-break')).map(rawYForElement);
  const keepBreaks = [];
  [...root.querySelectorAll('.sicod-keep-together')].forEach((element) => {
    const rect = element.getBoundingClientRect();
    const rawY = (rect.top - rootRect.top) * scale;
    const rawH = rect.height * scale;
    if (rawH > 0 && rawH < pageH * 0.92) keepBreaks.push({ rawY, rawH });
  });

  const computeAdjustedY = (rawY) => {
    const breaks = [...explicitBreaks];
    keepBreaks.sort((a, b) => a.rawY - b.rawY).forEach((item) => {
      const adjustedTop = applyBreaks(item.rawY, breaks);
      if ((adjustedTop % pageH) + item.rawH > pageH - 5) breaks.push(item.rawY);
    });
    return applyBreaks(rawY, breaks);
  };

  const rectToPdf = (rect) => {
    const rawX = (rect.left - rootRect.left) * scale;
    const rawY = computeAdjustedY((rect.top - rootRect.top) * scale);
    const pageIndex = Math.max(0, Math.floor(rawY / pageH));
    return {
      pageIndex,
      x: rawX,
      y: rawY - pageIndex * pageH,
      w: rect.width * scale,
      h: rect.height * scale
    };
  };

  function applyBreaks(rawY, breaks) {
    let offset = 0;
    let nextPage = 1;
    [...breaks].sort((a, b) => a - b).forEach((breakRaw) => {
      if (rawY < breakRaw) return;
      const adjustedBreak = breakRaw + offset;
      const targetTop = nextPage * pageH;
      if (adjustedBreak < targetTop) offset += targetTop - adjustedBreak;
      nextPage += 1;
    });
    return rawY + offset;
  }

  const hasVisibleText = (node) => String(node?.textContent || '').replace(/\s+/g, '').length > 0;
  const isTransparent = (value) => !value || value === 'transparent' || /rgba\([^)]*,\s*0\)/i.test(value);

  const drawElementBox = (element, pdfRect, computed) => {
    if (element === root || element.classList?.contains('sicod-page-body')) return;
    const background = computed.backgroundColor;
    const borderColor = cssColorToRgb(computed.borderTopColor, borderFallback);
    const hasBackground = !isTransparent(background);
    if (hasBackground) {
      doc.setFillColor(...cssColorToRgb(background, [255, 255, 255]));
      doc.rect(pdfRect.x, pdfRect.y, pdfRect.w, pdfRect.h, 'F');
    }
    doc.setDrawColor(...borderColor);
    if (Number.parseFloat(computed.borderTopWidth || '0') > 0) doc.line(pdfRect.x, pdfRect.y, pdfRect.x + pdfRect.w, pdfRect.y);
    if (Number.parseFloat(computed.borderRightWidth || '0') > 0) doc.line(pdfRect.x + pdfRect.w, pdfRect.y, pdfRect.x + pdfRect.w, pdfRect.y + pdfRect.h);
    if (Number.parseFloat(computed.borderBottomWidth || '0') > 0) doc.line(pdfRect.x, pdfRect.y + pdfRect.h, pdfRect.x + pdfRect.w, pdfRect.y + pdfRect.h);
    if (Number.parseFloat(computed.borderLeftWidth || '0') > 0) doc.line(pdfRect.x, pdfRect.y, pdfRect.x, pdfRect.y + pdfRect.h);
  };

  const fontStyleFor = (computed) => {
    const weight = Number.parseInt(computed.fontWeight || '400', 10);
    const italic = computed.fontStyle === 'italic';
    if (weight >= 600 && italic) return 'bolditalic';
    if (weight >= 600) return 'bold';
    if (italic) return 'italic';
    return 'normal';
  };

  const drawTextInRect = (text, rect, computed, options = {}) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean || rect.w <= 1 || rect.h <= 1) return;
    ensurePage(rect.pageIndex);
    const fontSizePx = Number.parseFloat(computed.fontSize || '12') || 12;
    const fontSizePt = Math.max(8.2, Math.min(20, fontSizePx * 0.76 * (options.scaleFont || 1)));
    const lineH = fontSizePt * 0.3528 * (options.compact ? 1.18 : 1.26);
    const padX = Math.min(2.5, Math.max(0.8, rect.w * 0.03));
    const padY = Math.min(3, Math.max(1.1, rect.h * 0.07));
    const maxW = Math.max(2, rect.w - padX * 2);
    setTemplatePdfFont(doc, options.bold ? 'bold' : fontStyleFor(computed));
    doc.setFontSize(fontSizePt);
    doc.setTextColor(...cssColorToRgb(computed.color, getPdfAppearance().text));
    const lines = doc.splitTextToSize(clean, maxW);
    const maxLines = Math.max(1, Math.floor((rect.h - padY * 2) / lineH));
    const fittedLines = lines.length > maxLines
      ? lines.slice(0, maxLines).map((line, index, arr) => (
        index === arr.length - 1
          ? `${String(line).replace(/[.\s]+$/g, '')}…`
          : line
      ))
      : lines;
    const align = computed.textAlign === 'center' ? 'center' : (computed.textAlign === 'right' ? 'right' : 'left');
    const x = align === 'center' ? rect.x + rect.w / 2 : (align === 'right' ? rect.x + rect.w - padX : rect.x + padX);
    doc.text(fittedLines, x, rect.y + padY + fontSizePt * 0.3528 * 0.74, { maxWidth: maxW, align });
  };

  const drawImageAtRect = (img, rect) => {
    const src = img.getAttribute('src') || img.src || '';
    if (!src || rect.w <= 1 || rect.h <= 1) return;
    ensurePage(rect.pageIndex);
    try {
      const props = doc.getImageProperties(src);
      const ratio = Math.min(rect.w / (props.width || rect.w), rect.h / (props.height || rect.h));
      const w = (props.width || rect.w) * ratio;
      const h = (props.height || rect.h) * ratio;
      doc.addImage(src, String(props.fileType || 'PNG').toUpperCase(), rect.x + (rect.w - w) / 2, rect.y + (rect.h - h) / 2, w, h, undefined, 'FAST');
    } catch {}
  };

  const drawTableAtRect = (table) => {
    Array.from(table.querySelectorAll('tr')).forEach((row) => {
      Array.from(row.children).forEach((cell) => {
        const cellRect = rectToPdf(cell.getBoundingClientRect());
        ensurePage(cellRect.pageIndex);
        const computed = cell.ownerDocument.defaultView.getComputedStyle(cell);
        drawElementBox(cell, cellRect, computed);
        const img = cell.querySelector(':scope > img');
        if (img) drawImageAtRect(img, cellRect);
        const text = firstMeaningfulText(cell);
        drawTextInRect(text, cellRect, computed, {
          bold: cell.tagName === 'TH' || row.parentElement?.tagName === 'THEAD',
          scaleFont: cell.tagName === 'TH' ? 0.9 : 0.86,
          compact: true
        });
      });
    });
  };

  const walk = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    const tag = element.tagName.toLowerCase();
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return;
    if (['script', 'style', 'audio', 'button', 'select', 'input', 'textarea'].includes(tag)) return;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pdfRect = rectToPdf(rect);
    ensurePage(pdfRect.pageIndex);
    const computed = element.ownerDocument.defaultView.getComputedStyle(element);
    drawElementBox(element, pdfRect, computed);
    if (tag === 'img') {
      drawImageAtRect(element, pdfRect);
      return;
    }
    if (tag === 'table') {
      drawTableAtRect(element);
      return;
    }
    const directText = getDirectText(element);
    if (directText) {
      const titleLike = ['h1', 'h2', 'h3', 'th'].includes(tag) || /sicod-page-title|ps-section-title|focus-label|block-title|cmd-urgent|exercise-banner/.test(element.className || '');
      drawTextInRect(directText, pdfRect, computed, {
        bold: titleLike,
        scaleFont: titleLike ? 1.02 : 0.9,
        compact: !titleLike
      });
    }
    Array.from(element.children).forEach(walk);
  };

  const maxRawY = Math.max(root.scrollHeight, rootRect.height) * scale;
  const totalPages = Math.max(1, Math.ceil(computeAdjustedY(maxRawY) / pageH));
  for (let i = 0; i < totalPages; i += 1) {
    ensurePage(i);
  }
  doc.setPage(1);
  walk(root);
}

function openHtmlTemplatePdf(key, tokens, title = 'document', options = {}) {
  return exportHtmlTemplatePdf(
    key,
    tokens,
    `${slugify(title || key || 'document')}.pdf`,
    Object.assign({ title }, options)
  );
}

function isEventWorkspaceActive(tab = '') {
  return isPageActive('events') && (!tab || state.currentEventWorkspaceTab === tab);
}

function buildPSHtmlTokens(ps) {
  const event = byId(state.events, ps.eventId);
  const means = ps.means ?? ps.moyens ?? '';
  const measures = ps.measures ?? ps.mesures ?? '';
  const attention = ps.attention ?? ps.points ?? '';
  const title = `POINT DE SITUATION N° ${ps.number}`;
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
    image_row: ps.image ? `<tr><td><div class="ps-section-title">Visuel associé</div></td><td><div class="ps-content"><img src="${ps.image}" alt="Visuel" style="max-width:100%;max-height:18rem;width:auto;height:auto;display:block;margin:0 auto;object-fit:contain">${ps.imageCaption ? `<div class="source-note">${esc(ps.imageCaption)}</div>` : ''}</div></td></tr>` : '',
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
      ? `<div><strong>Pour le préfet, par délégation</strong><div>${esc(sig.role || '')}</div><div>${esc(sig.name || '')}</div></div>`
      : `<div><strong>Le préfet</strong><div>${esc(sig.name || '')}</div></div>`)
    : '';
  const measuresRows = [
    ['Activation de la cellule de suivi', mark(d.suivi)],
    ['Prise de direction des opérations / activation du COD', mark(d.cod)],
    ['Activation du PCO', mark(d.pco)],
    ['Activation du plan de référence', mark(d.planActive) + (d.plan ? ` — ${esc(d.plan)}` : '')],
    ['Mise en oeuvre limitée à certaines mesures', mark(d.limited)],
    ["Activation d'une alerte sirène", mark(d.siren) + (d.sirenScenario ? ` — ${esc(d.sirenScenario)}` : '')],
    ["Signal de fin d'alerte", mark(d.endAlertSignal)],
    ["Diffusion d'un message FR-Alert", mark(d.frAlert) + (d.messageDetail ? ` — ${esc(d.messageDetail)}` : '')]
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
    eventTitle: esc(d.event || 'ÉVÉNEMENT À RENSEIGNER'),
    site: esc(d.site || ''),
    autoText: esc(d.autoText || ''),
    reference: esc(d.reference || ''),
    activation: esc(d.activation || ''),
    pcoLocation: esc(d.pcoLocation || ''),
    measuresRows,
    servicesRows,
    signature,
    originalSigned: d.originalSigned ? 'Original signé' : ''
  };
}

function buildEventLogHtmlTokens(eventId) {
  const e = byId(state.events, eventId || state.currentEventId);
  const items = getEventTimelineItems(e?.id);
  const signature = shouldApplyPdfSignature('event')
    ? (() => {
        const sig = getEventSignatureConfig();
        return sig.mode === 'delegation'
          ? `<div class="ps-signature"><div class="ps-signature-box"><div class="sig-line1">Pour le préfet, par délégation</div><div class="sig-line2">${esc(sig.role || '')}</div><div class="sig-line2">${esc(sig.name || '')}</div></div></div>`
          : `<div class="ps-signature"><div class="ps-signature-box"><div class="sig-line1">Le préfet</div><div class="sig-line2">${esc(sig.name || '')}</div></div></div>`;
      })()
    : '';
  return {
    logo: currentLogoSrc(),
    issueLine: esc(buildDocumentIssueLine(new Date(), true)),
    eventTitle: esc(e?.title || ''),
    eventMeta: esc([e?.type || '—', e?.location || '—', e?.level || '—'].join(' · ')),
    entriesRows: items.length
      ? items.map(item => `<tr><td>${formatDateTimeValueFR(item.date)}</td><td>${esc(item.author || 'SIRACEDPC')}</td><td><div class="timeline-title">${esc(item.title || '')}</div><div>${nl2br(item.detail || '')}</div></td></tr>`).join('')
      : '<tr><td colspan="3"><p class="help">Aucune entrée de main courante.</p></td></tr>',
    signature
  };
}

function buildStatHtmlTables(sections) {
  return sections.map(([title, rows]) => {
    const body = (rows && rows.length ? rows : [{ label: 'Aucune donnée', value: 0 }])
      .map(row => `<tr><td>${esc(row.label || '')}</td><td>${esc(row.value ?? 0)}</td></tr>`)
      .join('');
    return `<section class="block"><div class="block-title">${esc(title)}</div><table class="table"><thead><tr><th>Libellé</th><th style="width:10rem">Valeur</th></tr></thead><tbody>${body}</tbody></table></section>`;
  }).join('');
}

function buildReflexSheetHtmlTokens() {
  const fiches = getReflexFiches();
  return {
    logo: currentLogoSrc(),
    issueLine: esc(buildDocumentIssueLine()),
    header: `${fiches.length} fiche(s) active(s)`,
    sections: fiches.length
      ? fiches.map((fiche, index) => `<section class="block sicod-keep-together ${index > 0 ? 'sicod-export-page-break' : ''}">
          <div class="block-body" style="padding:4mm">
            <p class="sicod-reflex-subtitle">${esc(fiche.title || fiche.code || '')}</p>
            <p style="margin:0 0 3mm"><strong>Code :</strong> ${esc(fiche.code || '')}<br><strong>Famille :</strong> ${esc(fiche.family || 'Autres')}</p>
            ${
            (fiche.sections || []).map(sec => `<section class="sicod-reflex-section" style="margin-top:4mm"><h3>${esc(sec.heading || 'Contenu')}</h3><ul>${(sec.items || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul></section>`).join('')
          }</div>
        </section>`).join('')
      : '<p class="help">Aucune fiche réflexe active.</p>'
  };
}

function buildDirectoryHtmlTokens() {
  const groups = getDynamicList('directoryGroups');
  const contacts = [...getActiveItems(state.contacts)].sort((a, b) =>
    [a.group || '', a.entity || '', formatContactFullName(a)].join('|').localeCompare([b.group || '', b.entity || '', formatContactFullName(b)].join('|'), 'fr')
  );
  let renderedGroups = 0;
  const directory = groups.map(group => {
    const groupItems = contacts.filter(c => (c.group || '') === group);
    if (!groupItems.length) return '';
    const breakClass = renderedGroups++ > 0 ? ' sicod-export-page-break' : '';
    const entities = [...new Set(groupItems.map(c => (c.entity || '').trim() || 'Sans entité'))];
    return `<section class="block${breakClass}"><div class="block-title">${esc(group.toUpperCase())}</div>${
      entities.map(entity => {
        const entityItems = groupItems.filter(c => ((c.entity || '').trim() || 'Sans entité') === entity);
        const rows = entityItems.map(c => `<tr>
          <td>${esc(c.function || '')}</td><td>${esc(formatContactFullName(c))}</td><td>${esc(c.entity || '')}</td>
          <td>${esc(c.phone1 || '')}</td><td>${esc(c.phone2 || '')}</td><td>${esc([c.email1 || '', c.email2 || ''].filter(Boolean).join(' / '))}</td>
        </tr>`).join('');
        return `<section class="sicod-keep-together"><h3>${esc(entity)}</h3><table class="table"><thead><tr><th>Fonction</th><th>Nom</th><th>Entité</th><th>Téléphone 1</th><th>Téléphone 2</th><th>E-mail</th></tr></thead><tbody>${rows}</tbody></table></section>`;
      }).join('')
    }</section>`;
  }).join('');
  return {
    logo: currentLogoSrc(),
    subtitle: 'Bouches-du-Rhône',
    directory: directory || '<p class="help">Aucun contact enregistré.</p>'
  };
}

function buildPlanningFollowUpHtmlTokens() {
  const items = getActiveItems(state.planItems);
  const counts = {};
  getDynamicList('planStatuses').forEach(status => counts[status] = items.filter(i => i.status === status).length);
  const summary = [`${items.length} item(s)`, ...Object.entries(counts).map(([label, value]) => `${label} : ${value}`)].join(' - ');
  const rows = items.map(p => `<tr>
    <td>${esc(p.type || '')}</td><td>${esc(p.risk || '')}</td><td>${esc(p.item || '')}</td><td>${esc(p.priority || '')}</td>
    <td>${esc(p.status || '')}</td><td>${esc(formatIsoDateForDisplay(p.approvalDate || ''))}${resolvePlanExpiryDate(p) ? ` (exp. ${esc(formatIsoDateForDisplay(resolvePlanExpiryDate(p)))})` : ''}</td><td>${esc(p.observation || '')}</td>
  </tr>`).join('');
  return {
    logo: currentLogoSrc(),
    summary,
    table: `<table class="table"><thead><tr><th>Type</th><th>Risque</th><th>Item</th><th>Priorité</th><th>Statut</th><th>Approbation</th><th>Observation</th></tr></thead><tbody>${rows || '<tr><td colspan="7">Aucun item de planification.</td></tr>'}</tbody></table>`
  };
}

function buildPlanningStatisticsHtmlTokens() {
  const s = getPlanningStatsData();
  return {
    logo: currentLogoSrc(),
    summary: `Edition du ${new Date().toLocaleDateString('fr-FR')}`,
    charts: buildStatHtmlTables([
      ['Plans par type', s.types],
      ['Répartition par statut', s.statuses],
      ['Priorités', s.priorities],
      ['Typologies de risque', s.risks],
      ["Dates d'approbation par année", s.years]
    ])
  };
}

function buildDutyScheduleHtmlTokens() {
  const rows = state.dutySchedule || [];
  const roles = getDynamicList('dutyRoles');
  const role1 = roles[0] || 'Astreinte 1';
  const role2 = roles[1] || 'Astreinte 2';
  const startDateStr = rows[0]?.start || '';
  const endDateStr = rows[rows.length - 1]?.end || '';
  const startPeriod = parseDateLocal(document.getElementById('dutyPeriodStart')?.value || startDateStr);
  const endPeriod = parseDateLocal(document.getElementById('dutyPeriodEnd')?.value || endDateStr);
  const period = `Période du ${startPeriod ? formatDateLocal(startPeriod) : '...'} au ${endPeriod ? formatDateLocal(endPeriod) : '...'}`;
  const tableRows = rows.map(w => {
    const startDt = parseDateLocal(w.start), endDt = parseDateLocal(w.end);
    return `<tr><td>${esc(`${startDt ? formatDateLocal(startDt) : w.start} au ${endDt ? formatDateLocal(endDt) : w.end}`)}</td><td>${esc(w.agent1?.name || '-')}</td><td>${esc(w.agent2?.name || '-')}</td></tr>`;
  }).join('');
  let signature = '';
  if (shouldApplyPdfSignature('duty')) {
    const signLast = state.settings.dutySignerLastName || 'HAUPTMANN';
    const signFirst = state.settings.dutySignerFirstName || 'Nicolas';
    const signFunction = state.settings.dutySignerFunction || 'le directeur de cabinet';
    signature = `<div class="ps-signature"><div class="ps-signature-box"><div class="sig-line1">Pour le préfet, par délégation</div><div class="sig-line2">${esc(signFunction)}</div><div class="sig-line2">${esc(`${signFirst} ${signLast}`.trim() || 'SIRACEDPC')}</div></div></div>`;
  }
  return {
    logo: currentLogoSrc(),
    issueLine: esc(buildDocumentIssueLine()),
    period,
    intro: esc(`Les astreintes qualifiées de défense et de sécurité civiles, pour la période comprise entre le ${startPeriod ? formatDateLocal(startPeriod) : '...'} et le ${endPeriod ? formatDateLocal(endPeriod) : '...'}, doivent être prises en compte comme suit :`),
    table: `<table class="table"><thead><tr><th>Période</th><th>${esc(role1)}</th><th>${esc(role2)}</th></tr></thead><tbody>${tableRows || '<tr><td colspan="3">Aucun planning généré.</td></tr>'}</tbody></table>`,
    signature
  };
}

function buildDutyStatisticsHtmlTokens() {
  const year = Number(document.getElementById('dutyStatsYear')?.value || new Date().getFullYear());
  const s = getDutyStatsData(year);
  let signature = '';
  if (shouldApplyPdfSignature('duty')) {
    const signLast = state.settings.dutySignerLastName || 'HAUPTMANN';
    const signFirst = state.settings.dutySignerFirstName || 'Nicolas';
    const signFunction = state.settings.dutySignerFunction || 'le directeur de cabinet';
    signature = `<div class="ps-signature"><div class="ps-signature-box"><div class="sig-line1">Pour le préfet, par délégation</div><div class="sig-line2">${esc(signFunction)}</div><div class="sig-line2">${esc(`${signFirst} ${signLast}`.trim() || 'SIRACEDPC')}</div></div></div>`;
  }
  return {
    logo: currentLogoSrc(),
    issueLine: esc(buildDocumentIssueLine()),
    documentYear: esc(String(s.year)),
    summary: `Année ${s.year}`,
    charts: buildStatHtmlTables([
      [`${s.role1} - répartition annuelle`, s.a1],
      [`${s.role2} - répartition annuelle`, s.a2]
    ]),
    signature
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 5. NAVIGATION
// ────────────────────────────────────────────────────────────────────────────

function goPage(page) {
  if (isAuthLocked()) return;
  if (page === 'ps') {
    state.currentEventWorkspaceTab = 'ps';
    page = 'events';
  } else if (page === 'command') {
    state.currentEventWorkspaceTab = 'command';
    page = 'events';
  }
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page || ((page === 'event-archives' || page === 'event-detail') && b.dataset.page === 'events')));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  if (page === 'fiches') renderFiches();
  if (page === 'events') renderEvents();
  if (page === 'event-detail') renderEventDetail();
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

function isPageActive(page) {
  return document.getElementById(`page-${page}`)?.classList.contains('active');
}

function getActivePageName() {
  const activeId = document.querySelector('.page.active')?.id || 'page-dashboard';
  return activeId.replace(/^page-/, '');
}

function ensureEventArchivesPage() {
  const main = document.querySelector('main.main');
  if (!main || document.getElementById('page-event-archives')) return;
  main.insertAdjacentHTML('beforeend', `
    <section class="page" id="page-event-archives">
      <div class="page-inner">
        <div class="page-header">
          <div><h1>Archives des événements</h1></div>
          <div class="event-page-actions">
            <button class="fr-btn secondary" type="button" onclick="goPage('events')">Retour aux événements</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h2 class="card-title">Événements archivés</h2></div>
          <div class="card-body">
            <div class="events-toolbar">
              <input class="list-search" id="eventArchiveSearch" type="search" placeholder="Rechercher un événement archivé…" oninput="renderEventArchives()">
            </div>
            <div class="grid-2" id="eventArchivesList"></div>
          </div>
        </div>
      </div>
    </section>
  `);
}

function ensureEventDetailPage() {
  const main = document.querySelector('main.main');
  if (!main || document.getElementById('page-event-detail')) return;
  main.insertAdjacentHTML('beforeend', `
    <section class="page" id="page-event-detail">
      <div class="page-inner">
        <div class="page-header">
          <div>
            <h1 id="eventDetailPageTitle">Conduite de l'événement</h1>
            <p class="help" id="eventDetailPageMeta"></p>
          </div>
          <div class="event-page-actions">
            <button class="fr-btn secondary" type="button" onclick="closeEventDetail()">Retour aux événements</button>
          </div>
        </div>
        <div id="eventDetailWorkspaceHost"></div>
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
        <input class="list-search" id="eventSearch" type="search" placeholder="Rechercher par libellé, type, commune, niveau ou ID Synergi…" oninput="renderEvents()">
      </div>
    `);
  }
  const archivedCard = Array.from(document.querySelectorAll('#page-events .card')).find((card) =>
    card.querySelector('.card-title')?.textContent?.trim() === 'Événements archivés'
  );
  if (archivedCard) archivedCard.remove();
  ensureEventArchivesPage();
  ensureEventDetailPage();
  ensureEventWorkspaceUI();
}

function ensureEventWorkspaceUI() {
  const pageInner = document.querySelector('#page-events .page-inner');
  const detailHost = document.getElementById('eventDetailWorkspaceHost');
  if (!pageInner || !detailHost) return;
  const activeCard = pageInner.querySelector('#eventList')?.closest('.card');
  const timelineCard = document.getElementById('eventTimelineCard');
  if (!activeCard || !timelineCard) return;
  activeCard.classList.add('event-selector-card');
  let workspace = document.getElementById('eventWorkspaceCard');
  if (!workspace) {
    workspace = document.createElement('div');
    workspace.className = 'card';
    workspace.id = 'eventWorkspaceCard';
    workspace.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">Conduite de l'événement</h2>
      <div class="page-subtabs" id="eventWorkspaceTabs">
        <button class="page-subtab active" data-workspace-tab="timeline" type="button" onclick="showEventWorkspaceTab('timeline')">Main courante</button>
        <button class="page-subtab" data-workspace-tab="ps" type="button" onclick="showEventWorkspaceTab('ps')">Points de situation</button>
        <button class="page-subtab" data-workspace-tab="command" type="button" onclick="showEventWorkspaceTab('command')">Messages de commandement</button>
      </div>
    </div>
    <div class="card-body event-workspace">
      <div id="eventWorkspaceTimeline" class="event-workspace-panel active"></div>
      <div id="eventWorkspacePs" class="event-workspace-panel">
        <div class="card event-manager-card">
          <div class="card-header">
            <h2 class="card-title">Points de situation</h2>
            <div class="list-actions">
              <button class="fr-btn" type="button" onclick="openPSForm()">Ajouter</button>
            </div>
          </div>
          <div class="card-body event-list-shell">
            <div class="event-tab-toolbar">
              <input class="list-search" id="eventPsListSearch" type="search" placeholder="Rechercher par numéro, auteur, statut…" oninput="renderPSList()">
            </div>
            <div class="table-wrap" id="eventPsList"></div>
          </div>
        </div>
      </div>
      <div id="eventWorkspaceCommand" class="event-workspace-panel">
        <div class="card event-manager-card">
          <div class="card-header">
            <h2 class="card-title">Messages de commandement</h2>
            <div class="list-actions">
              <button class="fr-btn" type="button" onclick="openCommandForm()">Ajouter</button>
            </div>
          </div>
          <div class="card-body event-list-shell">
            <div class="event-tab-toolbar">
              <input class="list-search" id="eventCommandListSearch" type="search" placeholder="Rechercher par numéro, événement, statut…" oninput="renderCommandList()">
            </div>
            <div class="table-wrap" id="eventCommandList"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  }
  detailHost.appendChild(workspace);
  document.getElementById('eventWorkspaceTimeline')?.appendChild(timelineCard);
}

function closeEventDetail() {
  state.currentEventId = null;
  state.currentEventWorkspaceTab = 'timeline';
  goPage('events');
}

function showEventWorkspaceTab(tab) {
  const normalizedTab = ['timeline', 'ps', 'command'].includes(tab) ? tab : 'timeline';
  state.currentEventWorkspaceTab = normalizedTab;
  document.querySelectorAll('#eventWorkspaceTabs .page-subtab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.workspaceTab === state.currentEventWorkspaceTab);
  });
  document.querySelectorAll('.event-workspace-panel').forEach((panel) => panel.classList.remove('active'));
  const target = {
    timeline: 'eventWorkspaceTimeline',
    ps: 'eventWorkspacePs',
    command: 'eventWorkspaceCommand'
  }[state.currentEventWorkspaceTab] || 'eventWorkspaceTimeline';
  document.getElementById(target)?.classList.add('active');
  if (state.currentEventWorkspaceTab === 'ps') {
    renderPSList();
  }
  if (state.currentEventWorkspaceTab === 'command') {
    renderCommandList();
  }
  if (state.currentEventWorkspaceTab === 'timeline') renderEventTimeline(state.currentEventId);
}

// ────────────────────────────────────────────────────────────────────────────
// 6. MODULE DASHBOARD
// ────────────────────────────────────────────────────────────────────────────

function renderDashboard() {
  refreshDashboardBanner();
  const kpiEvents = document.getElementById('kpiEvents');
  const kpiContacts = document.getElementById('kpiContacts');
  const kpiArchived = document.getElementById('kpiArchived');
  const kpiPlansTotal = document.getElementById('kpiPlansTotal');
  const kpiPlansUpToDate = document.getElementById('kpiPlansUpToDate');
  const kpiPlansTodo = document.getElementById('kpiPlansTodo');
  const kpiPlansInProgress = document.getElementById('kpiPlansInProgress');

  const planItems = getActiveItems(state.planItems);
  const activeEvents = getActiveItems(state.events).filter(e => e.status !== 'Archivé');
  const archivedEvents = (state.events || []).filter(e => e && !e.deletedAt && e.status === 'Archivé');
  const activePS = getActiveItems(state.ps);
  const activeContacts = getActiveItems(state.contacts);
  const planStatusNorm = (value) => String(value || '').trim().toLowerCase();
  const isPlanUpToDate = (p) => planStatusNorm(p?.status) === 'a jour' || planStatusNorm(p?.status) === 'à jour';
  const isPlanTodo = (p) => planStatusNorm(p?.status) === 'a programmé' || planStatusNorm(p?.status) === 'à programmer' || planStatusNorm(p?.status) === 'a programmer';
  const isPlanInProgress = (p) => planStatusNorm(p?.status) === 'en cours';

  if (kpiEvents) kpiEvents.textContent = activeEvents.length;
  if (kpiContacts) kpiContacts.textContent = activeContacts.length;
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
      : '<p class="help">Aucun événement actif.</p>';
  }

  const dashPS = document.getElementById('dashboardPS');
  if (dashPS) {
    const latestPS = [...activePS].sort((a, b) => (b.updatedAt||'').localeCompare(a.updatedAt||'')).slice(0, 5);
    dashPS.innerHTML = latestPS.length
      ? `<table class="table"><thead><tr><th>N°</th><th>Événement</th><th>Auteur</th><th>Statut</th></tr></thead><tbody>${latestPS.map(ps => `<tr><td>${esc(ps.number)}</td><td>${esc(getEventTitle(ps.eventId))}</td><td>${esc(ps.author)}</td><td>${badge(ps.status)}</td></tr>`).join('')}</tbody></table>`
      : '<p class="help">Aucun point de situation.</p>';
  }

  const dashPlans = document.getElementById('dashboardPlans');
  if (dashPlans) {
    const inProgress = planItems.filter(p => !isPlanUpToDate(p)).slice(0, 5);
    dashPlans.innerHTML = inProgress.length
      ? `<table class="table"><thead><tr><th>Item</th><th>Priorité</th><th>Statut</th></tr></thead><tbody>${inProgress.map(p => `<tr><td>${esc(p.item||'')}</td><td>${esc(p.priority||'')}</td><td>${badge(p.status||'')}</td></tr>`).join('')}</tbody></table>`
      : '<p class="help">Aucun plan en attente.</p>';
  }

  const dashDuty = document.getElementById('dashboardDutyPair');
  if (dashDuty) {
    const today = todayISO();
    const week = (state.dutySchedule || []).find((entry) => entry.start <= today && entry.end >= today);
    if (week) {
      const roles = getDynamicList('dutyRoles');
      dashDuty.innerHTML = `<table class="table"><tbody>
        <tr><th>${esc(roles[0]||'Astreinte 1')}</th><td>${esc(week.agent1?.name || '—')}</td></tr>
        <tr><th>${esc(roles[1]||'Astreinte 2')}</th><td>${esc(week.agent2?.name || '—')}</td></tr>
      </tbody></table><p class="help">Semaine du ${esc(formatDateFR(week.start))} au ${esc(formatDateFR(week.end))}</p>`;
    } else {
      dashDuty.innerHTML = '<p class="help">Aucun planning généré pour cette semaine.</p>';
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 7. MODULE ÉVÉNEMENTS
// ────────────────────────────────────────────────────────────────────────────


const DEFAULT_EVENT_TYPES = ['Accident','Feu','Intempéries','Inondation','Mouvement social','Pollution','Risque sanitaire','Sécurité publique','Transport','Autre'];
const COMMUNES_13 = ['13100 - Aix-en-Provence','13190 - Allauch','13980 - Alleins','13200 - Arles','13400 - Aubagne','13930 - Aureille','13390 - Auriol','13121 - Aurons','13330 - La Barben','13570 - Barbentane','13520 - Les Baux-de-Provence','13100 - Beaurecueil','13720 - Belcodène',"13130 - Berre-l'Étang",'13320 - Bouc-Bel-Air','13720 - La Bouilladisse','13150 - Boulbon','13440 - Cabannes','13480 - Cabriès','13950 - Cadolive','13470 - Carnoux-en-Provence','13620 - Carry-le-Rouet','13260 - Cassis','13600 - Ceyreste','13350 - Charleval','13790 - Châteauneuf-le-Rouge','13220 - Châteauneuf-les-Martigues','13160 - Châteaurenard','13600 - La Ciotat','13250 - Cornillon-Confoux','13111 - Coudoux','13780 - Cuges-les-Pins','13112 - La Destrousse','13510 - Éguilles','13820 - Ensuès-la-Redonne','13810 - Eygalières','13430 - Eyguières','13630 - Eyragues','13580 - La Fare-les-Oliviers','13990 - Fontvieille','13270 - Fos-sur-Mer','13710 - Fuveau','13120 - Gardanne','13420 - Gémenos','13180 - Gignac-la-Nerthe','13450 - Grans','13690 - Graveson','13850 - Gréasque','13800 - Istres','13490 - Jouques','13113 - Lamanon','13410 - Lambesc','13680 - Lançon-Provence','13910 - Maillane','13370 - Mallemort','13700 - Marignane','13000 - Marseille','13500 - Martigues','13103 - Mas-Blanc-des-Alpilles','13520 - Maussane-les-Alpilles','13650 - Meyrargues','13590 - Meyreuil','13105 - Mimet','13140 - Miramas','13940 - Mollégès','13890 - Mouriès','13550 - Noves','13660 - Orgon','13520 - Paradou','13330 - Pélissanne','13821 - La Penne-sur-Huveaune','13170 - Les Pennes-Mirabeau','13790 - Peynier','13124 - Peypin','13860 - Peyrolles-en-Provence','13380 - Plan-de-Cuques',"13750 - Plan-d'Orgon",'13110 - Port-de-Bouc','13230 - Port-Saint-Louis-du-Rhône','13114 - Puyloubier','13610 - Le Puy-Sainte-Réparade','13340 - Rognac','13840 - Rognes','13870 - Rognonas',"13640 - La Roque-d'Anthéron",'13830 - Roquefort-la-Bédoule','13360 - Roquevaire','13790 - Rousset','13740 - Le Rove','13670 - Saint-Andiol','13100 - Saint-Antonin-sur-Bayon','13760 - Saint-Cannat','13250 - Saint-Chamas','13610 - Saint-Estève-Janson','13103 - Saint-Étienne-du-Grès','13100 - Saint-Marc-Jaumegarde','13310 - Saint-Martin-de-Crau','13920 - Saint-Mitre-les-Remparts','13115 - Saint-Paul-lès-Durance','13150 - Saint-Pierre-de-Mézoargues','13210 - Saint-Rémy-de-Provence','13119 - Saint-Savournin','13730 - Saint-Victoret','13460 - Saintes-Maries-de-la-Mer','13300 - Salon-de-Provence','13960 - Sausset-les-Pins','13560 - Sénas','13240 - Septèmes-les-Vallons','13109 - Simiane-Collongue','13150 - Tarascon','13100 - Le Tholonet','13530 - Trets','13126 - Vauvenargues','13880 - Velaux','13770 - Venelles','13122 - Ventabren','13116 - Vernègues','13670 - Verquières','13127 - Vitrolles'];
function getEventTypeOptions(){ const configured = (state.settings?.dynamicLists||{}).eventTypes; return Array.isArray(configured) && configured.length ? configured : DEFAULT_EVENT_TYPES.slice(); }
function populateEventTypeSelect(selected){ const el=document.getElementById('eventType'); if(!el) return; setSelectOptions(el,getEventTypeOptions(),selected||''); }
function populateCommuneDatalist(){ const list=document.getElementById('communes13List'); if(!list) return; const extra=getActiveItems(state.events).map(e=>e.location).filter(Boolean); const items=[...new Set([...COMMUNES_13,...extra])].sort((a,b)=>a.localeCompare(b,'fr')); list.innerHTML=items.map(v=>`<option value="${esc(v)}"></option>`).join(''); }
function isEventArchived(eventId){ const e=byId(state.events,eventId); return !!e && e.status==='Archivé'; }
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
  if (!titleEl || !titleEl.value.trim()) { showToast('Le libellé est requis.', 'error'); return; }
  const id = idEl?.value || uid('evt');
  const existing = byId(state.events, id);
  if (existing && existing.status === 'Archivé') { showToast('Un événement archivé ne peut pas être modifié.', 'error'); return; }
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
  if (!ensureWriteAccess()) return;
  if (existing) Object.assign(existing, data);
  else state.events.unshift(data);
  persist();
  document.getElementById('eventDialog').close();
  renderAll();
}

function archiveEvent(id) {
  const e = byId(state.events, id);
  if (!e) return;
  if (!ensureWriteAccess()) return;
  e.status = 'Archivé';
  e.updatedAt = new Date().toISOString();
  if (state.currentEventId === id) state.currentEventId = null;
  persist();
  renderAll();
}

function reactivateEvent(id) {
  const e = byId(state.events, id);
  if (!e) return;
  if (!ensureWriteAccess()) return;
  e.status = 'Actif';
  e.updatedAt = new Date().toISOString();
  persist();
  renderAll();
}

async function deleteEvent(id) {
  if (!await confirmAsync('Supprimer cet événement et les points de situation rattachés ?')) return;
  if (!ensureWriteAccess()) return;
  window.SICODDataModel?.archiveRecord(state.events, id);
  getActiveItems(state.ps).filter(ps => ps.eventId === id).forEach(ps => {
    window.SICODDataModel?.archiveRecord(state.ps, ps.id);
  });
  if (state.currentEventId === id) {
    state.currentEventId = null;
    state.currentEventWorkspaceTab = 'timeline';
  }
  persist();
  if (getActivePageName() === 'event-detail') {
    goPage('events');
    return;
  }
  renderAll();
}

function openEvent(id) {
  const e = byId(state.events, id);
  if (!e) return;
  state.currentEventId = id;
  state.currentEventWorkspaceTab = 'timeline';
  goPage('event-detail');
}

function openEventEntryForm() {
  const eventId = state.currentEventId;
  const e = byId(state.events, eventId);
  if (!e) { showToast('Sélectionnez un événement.', 'error'); return; }
  if (e.status === 'Archivé') { showToast('Un événement archivé ne peut pas être enrichi.', 'error'); return; }
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
  if (e.status === 'Archivé') { showToast('Un événement archivé ne peut pas être enrichi.', 'error'); return; }
  const title = (document.getElementById('eventLogTitle').value || '').trim();
  const detail = (document.getElementById('eventLogDetail').value || '').trim();
  const author = (document.getElementById('eventLogAuthor').value || '').trim() || 'SIRACEDPC';
  if (!title) { showToast('Le titre est requis.', 'error'); return; }
  if (!ensureWriteAccess()) return;
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
  const manual = (Array.isArray(e.logEntries) ? e.logEntries : [])
    .filter((item) => !item?.commandMessageId)
    .map(item => ({
    date: item.createdAt,
    author: item.author || 'SIRACEDPC',
    title: item.title || '',
    detail: item.detail || ''
  }));
  const relatedPS = getActiveItems(state.ps)
    .filter(ps => ps.eventId === eventId && ps.status === 'Diffusé')
    .map(ps => ({
      date: ps.updatedAt || ps.createdAt || new Date().toISOString(),
      author: ps.author || 'SIRACEDPC',
      title: ps.title || `Point de situation ${ps.number || ''}`.trim(),
      detail: `Point de situation ${ps.number ? 'n° ' + ps.number : ''}${ps.status ? ' — ' + ps.status : ''}`
    }));
  const commandItems = getActiveItems(state.commandMessages)
    .filter(cmd => cmd.eventId === eventId && cmd.status === 'Diffusé')
    .map(cmd => ({
      date: cmd.updatedAt || cmd.createdAt || new Date().toISOString(),
      author: 'SIRACEDPC',
      title: `${cmd.typeLabel || 'Message de commandement'}${cmd.number ? ' n° ' + cmd.number : ''}`,
      detail: `Message de commandement ${cmd.status.toLowerCase()}`
    }));
  const seen = new Set();
  return manual.concat(relatedPS, commandItems)
    .filter((item) => {
      const key = [item.date || '', item.author || '', item.title || '', item.detail || ''].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
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
  header.innerHTML = `<h3>${esc(e.title)}</h3><div class="help">${esc(e.type || '—')} · ${esc(e.location || '—')} · ${esc(e.level || '—')}</div>`;
  const items = getEventTimelineItems(e.id);
  const sortedItems = sortItems(items, 'timeline', 'date', 'desc', {
    date: (item) => item.date || '',
    author: (item) => item.author || '',
    title: (item) => item.title || ''
  });
  tableWrap.innerHTML = sortedItems.length ? `<table class="table"><thead><tr><th style="width:13rem" class="sortable-th" role="button" tabindex="0" onclick="sortTableColumn('timeline','date')" onkeydown="handleSortHeaderKey(event,'timeline','date')">Date / heure${getTableSort('timeline','date','desc').key === 'date' ? (getTableSort('timeline','date','desc').direction === 'asc' ? ' ▲' : ' ▼') : ''}</th><th style="width:10rem" class="sortable-th" role="button" tabindex="0" onclick="sortTableColumn('timeline','author')" onkeydown="handleSortHeaderKey(event,'timeline','author')">Auteur${getTableSort('timeline','date','desc').key === 'author' ? (getTableSort('timeline','date','desc').direction === 'asc' ? ' ▲' : ' ▼') : ''}</th><th class="sortable-th" role="button" tabindex="0" onclick="sortTableColumn('timeline','title')" onkeydown="handleSortHeaderKey(event,'timeline','title')">Entrée${getTableSort('timeline','date','desc').key === 'title' ? (getTableSort('timeline','date','desc').direction === 'asc' ? ' ▲' : ' ▼') : ''}</th></tr></thead><tbody>${sortedItems.map(item => `<tr><td>${formatDateTimeValueFR(item.date)}</td><td>${esc(item.author || 'SIRACEDPC')}</td><td><div class="timeline-title">${esc(item.title || '')}</div><div>${nl2br(item.detail || '')}</div></td></tr>`).join('')}</tbody></table>` : '<p class="help">Aucune entrée de main courante.</p>';
}

async function exportEventLogDocx() {
  const eventId = state.currentEventId;
  const event = byId(state.events, eventId);
  if (!event) {
    showToast('Sélectionnez un événement.', 'error');
    return;
  }
  try {
    const { zip, doc } = await loadDocxDocument('mainCourante');
    const now = new Date();
    replacePlaceholderText(doc, '[date de génération]', now.toLocaleDateString('fr-FR'));
    replacePlaceholderText(doc, '[heure courante]', now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    replacePlaceholderText(doc, '[Titre évènement]', event.title || '');
    replaceRowsMatchingText(doc, '[Auteur]', buildEventLogDocxRows(eventId), (row, item) => {
      replacePlaceholderText(row, '[Date] [heure]', item.dateTime, false);
      replacePlaceholderText(row, '[Auteur]', item.author, false);
      replacePlaceholderText(row, '[titre entrée]', item.title, false);
      replacePlaceholderText(row, '[complément détail]', item.detail, false);
    });
    await exportDocxBlob(saveDocxDocument(zip, doc), `main-courante-${slugify(event.title || 'evenement')}.docx`);
    showToast('Main courante exportée en DOCX.');
  } catch (error) {
    showToast(`Export DOCX impossible : ${error.message || String(error)}`, 'error');
  }
}

function exportEventLogPDF() {
  return exportEventLogDocx();
}

function renderEvents() {
  ensureEventPageEnhancements();
  const eventList = document.getElementById('eventList');
  if (!eventList) return;

  const active = getActiveItems(state.events).filter(e => e.status !== 'Archivé');
  const q = (document.getElementById('eventSearch')?.value || '').toLowerCase().trim();
  const filteredActive = q
    ? active.filter(e => [e.title, e.type, e.location, e.level, e.synergi].join(' ').toLowerCase().includes(q))
    : active;

  const tmpl = e => {
    return `<div class="event-card">
      <div class="event-card-head">
        <div class="event-card-main">
          <h3>${esc(e.title)}</h3>
          <div class="event-meta">
            <span>${esc(e.type || '')}</span>
            <span>${esc(e.location || '')}</span>
            <span>${esc(e.level || '')}</span>
            ${e.synergi ? `<span>ID Synergi ${esc(e.synergi)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="event-actions">
        ${e.status === 'Archivé'
          ? `<button class="fr-btn secondary small" onclick="reactivateEvent('${e.id}')">Réactiver</button>
             <button class="fr-btn danger small" onclick="deleteEvent('${e.id}')">Supprimer</button>`
          : `<button class="fr-btn small" onclick="openEvent('${e.id}')">Ouvrir</button>
             <button class="fr-btn secondary small" onclick="openEventForm('${e.id}')">Modifier</button>
             <button class="fr-btn secondary small" onclick="archiveEvent('${e.id}')">Archiver</button>
             <button class="fr-btn danger small" onclick="deleteEvent('${e.id}')">Supprimer</button>`
        }
      </div>
    </div>`;
  };

  eventList.innerHTML = filteredActive.length ? filteredActive.map(tmpl).join('') : (window.SICODUI?.setEmptyState?.('Aucun événement actif. Créer un premier événement.', 'Ajouter', 'openEventForm()') || '<p class="help">Aucun événement actif.</p>');
  updatePSEventSelect();
  populateCommuneDatalist();
  if (state.currentEventId && isPageActive('event-detail')) {
    renderEventDetail();
  }
}

function renderEventDetail() {
  ensureEventPageEnhancements();
  ensureEventDetailPage();
  ensureEventWorkspaceUI();
  const event = byId(state.events, state.currentEventId);
  if (!event) {
    goPage('events');
    return;
  }
  const title = document.getElementById('eventDetailPageTitle');
  const meta = document.getElementById('eventDetailPageMeta');
  if (title) title.textContent = event.title || "Conduite de l'événement";
  if (meta) meta.textContent = [event.type || '—', event.location || '—', event.level || '—', event.synergi ? `ID Synergi ${event.synergi}` : ''].filter(Boolean).join(' · ');
  renderEventTimeline(event.id);
  showEventWorkspaceTab(state.currentEventWorkspaceTab || 'timeline');
}

function renderEventArchives() {
  ensureEventArchivesPage();
  const archiveList = document.getElementById('eventArchivesList');
  if (!archiveList) return;
  const archived = (state.events || []).filter(e => e && !e.deletedAt && e.status === 'Archivé');
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
      <button class="fr-btn secondary small" onclick="reactivateEvent('${e.id}')">Réactiver</button>
      <button class="fr-btn danger small" onclick="deleteEvent('${e.id}')">Supprimer</button>
    </div>
  </div>`;
  archiveList.innerHTML = filtered.length ? filtered.map(tmpl).join('') : '<p class="help">Aucune archive.</p>';
}

function updatePSEventSelect() {
  const psEvent = document.getElementById('psEvent');
  if (!psEvent) return;
  const active = getActiveItems(state.events).filter(e => e.status !== 'Archivé');
  psEvent.innerHTML = active.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('');
  if (state.currentEventId && active.some(e => e.id === state.currentEventId)) psEvent.value = state.currentEventId;
}
// ────────────────────────────────────────────────────────────────────────────
// 8. MODULE POINTS DE SITUATION
// ────────────────────────────────────────────────────────────────────────────

let psMediaRecorder = null, psChunks = [];

function openPSForm(id) {
  updatePSEventSelect();
  const ps = id ? byId(state.ps, id) : null;
  const draft = !ps ? window.SICODPS?.loadDraft?.() : null;
  const targetEventId = ps?.eventId || state.currentEventId || document.getElementById('psEvent')?.value || '';
  if (targetEventId && isEventArchived(targetEventId)) { showToast("Les points de situation d'un événement archivé ne sont pas modifiables.", 'error'); return; }
  document.getElementById('psId').value = ps?.id || '';

  const psEvent = document.getElementById('psEvent');
  const firstActiveEvent = getActiveItems(state.events).find(e => e.status !== 'Archivé');
  if (psEvent) psEvent.value = ps?.eventId || draft?.eventId || state.currentEventId || firstActiveEvent?.id || '';

  document.getElementById('psAuthor').value = ps?.author || draft?.author || state.settings?.author || 'SIRACEDPC';
  document.getElementById('psStatus').value = normalizePublishStatus(ps?.status || draft?.status, 'Brouillon');
  document.getElementById('psClassification').value = ps?.classification || draft?.classification || state.settings?.classification || 'Non protégé';
  document.getElementById('psFormat').value = ps?.format || draft?.format || state.settings?.psFormat || 'detail';
  document.getElementById('psTitle').value = ps?.title || draft?.title || '';
  document.getElementById('psSituation').value = ps?.situation || draft?.situation || '';
  document.getElementById('psAttention').value = ps?.attention ?? ps?.points ?? draft?.attention ?? '';
  document.getElementById('psMeans').value = ps?.means ?? ps?.moyens ?? draft?.means ?? '';
  document.getElementById('psMeasures').value = ps?.measures ?? ps?.mesures ?? draft?.measures ?? '';
  document.getElementById('psCommunication').value = ps?.communication || draft?.communication || '';
  const initialImage = ps?.image || draft?.image || '';
  const psImageInput = document.getElementById('psImage');
  const psImageDataInput = document.getElementById('psImageData');
  const psImageMeta = document.getElementById('psImageMeta');
  if (psImageInput) psImageInput.value = initialImage && !String(initialImage).startsWith('data:') ? initialImage : '';
  if (psImageDataInput) psImageDataInput.value = initialImage && String(initialImage).startsWith('data:') ? initialImage : '';
  if (psImageMeta) psImageMeta.textContent = initialImage
    ? (String(initialImage).startsWith('data:') ? 'Visuel importé' : 'Visuel lié par URL')
    : 'Aucun visuel importé';
  document.getElementById('psImageCaption').value = ps?.imageCaption || draft?.imageCaption || '';
  document.getElementById('psTranscript').value = ps?.transcript || draft?.transcript || '';
  document.getElementById('psDcd').value = ps?.bilan?.dcd ?? draft?.bilan?.dcd ?? 0;
  document.getElementById('psUa').value = ps?.bilan?.ua ?? draft?.bilan?.ua ?? 0;
  document.getElementById('psUr').value = ps?.bilan?.ur ?? draft?.bilan?.ur ?? 0;
  document.getElementById('psImpliques').value = ps?.bilan?.impliques ?? draft?.bilan?.impliques ?? 0;
  document.getElementById('psBilanNotes').value = ps?.bilan?.notes || draft?.bilan?.notes || '';

  updatePSImageThumb(initialImage || '');

  const audioPrev = document.getElementById('psAudioPreview');
  const audioMeta = document.getElementById('psAudioMeta');
  if (audioPrev) {
    audioPrev.src = ps?.audioData || '';
    audioPrev.style.display = ps?.audioData ? 'block' : 'none';
  }
  if (audioMeta) audioMeta.textContent = ps?.audioData ? 'Source audio enregistrée ou importée' : 'Aucune source audio';

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
          image: resolvePSImageValue(),
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
  if (eventId && isEventArchived(eventId)) { showToast('Impossible de modifier un point de situation rattaché à un événement archivé.', 'error'); return; }
  const siblings = state.ps.filter(p => p.eventId === eventId && p.id !== id);

  const audioEl = document.getElementById('psAudioPreview');
  // Ne stocker les données audio que si c'est un data URI (pas une blob URL non persistante)
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
    image: resolvePSImageValue(),
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

  if (!ensureWriteAccess()) return;
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
  if (!ensureWriteAccess()) return;
  window.SICODDataModel?.archiveRecord(state.ps, id);
  if (state.selectedPSId === id) state.selectedPSId = getActiveItems(state.ps)[0]?.id || null;
  persist();
  renderAll();
}

function selectPS(id) {
  state.selectedPSId = state.selectedPSId === id ? null : id;
  renderPSList();
}

function duplicatePS(id) {
  const src = byId(state.ps, id);
  if (!src) return;
  if (!ensureWriteAccess()) return;
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
  showToast('Point de situation dupliqué.');
}

function renderOperationalTable({
  containerId,
  emptyMessage,
  emptyActionLabel,
  emptyActionHandler,
  searchValue,
  items,
  sortKey,
  sortAccessors,
  buildTitleCell,
  buildRowActions,
  selectedId
}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const q = String(searchValue || '').toLowerCase().trim();
  const filtered = q
    ? items.filter((item) => [item.number, item.author, item.status, item.title, item.typeLabel, item.event, getEventTitle(item.eventId)].join(' ').toLowerCase().includes(q))
    : items;
  const orderedItems = sortItems(filtered, sortKey, 'date', 'desc', sortAccessors);
  if (!orderedItems.length) {
    container.innerHTML = window.SICODUI?.setEmptyState?.(emptyMessage, emptyActionLabel, emptyActionHandler) || `<p class="help">${esc(emptyMessage)}</p>`;
    return;
  }
  container.innerHTML = `<table class="table"><thead><tr>${sortableTh(sortKey,'date','Horodatage','date','desc')}${sortableTh(sortKey,'number','Numéro','date','desc')}${sortableTh(sortKey,'event','Évènement','date','desc')}${sortableTh(sortKey,'status','Statut','date','desc')}<th>Action</th></tr></thead><tbody>${
    orderedItems.map((item) => `<tr class="${item.id === selectedId ? 'is-selected' : ''}">
      <td>${esc(formatDateTimeValueFR(item.updatedAt || item.createdAt || ''))}</td>
      <td>${buildTitleCell(item)}</td>
      <td>${esc(item.event || getEventTitle(item.eventId) || 'Évènement supprimé')}</td>
      <td>${badge(item.status)}</td>
      <td><div class="list-actions">${buildRowActions(item)}</div></td>
    </tr>`).join('')
  }</tbody></table>`;
}

function renderPSList() {
  const source = getActiveItems(state.ps).filter(isLinkedToActiveEvent);
  if (state.selectedPSId && !source.some((item) => item.id === state.selectedPSId)) {
    state.selectedPSId = null;
  }
  const items = state.currentEventId
    ? source.filter(ps => ps.eventId === state.currentEventId)
    : source;
  renderOperationalTable({
    containerId: 'eventPsList',
    emptyMessage: 'Aucun point de situation. Créer un premier point de situation.',
    emptyActionLabel: 'Ajouter',
    emptyActionHandler: 'openPSForm()',
    searchValue: document.getElementById('eventPsListSearch')?.value,
    items,
    sortKey: 'ps',
    sortAccessors: {
      date: (ps) => String(ps.updatedAt || ps.createdAt || ''),
      number: (ps) => Number(ps.number || 0),
      event: (ps) => getEventTitle(ps.eventId),
      status: (ps) => ps.status || ''
    },
    buildTitleCell: (ps) => `<div class="event-title-block"><span class="event-label">PS ${esc(ps.number || '')}</span><span class="table-meta">${esc(ps.title || '')}</span></div>`,
    buildRowActions: (ps) => `
      ${actionIconButton('edit', 'Modifier', `openPSForm('${ps.id}')`)}
      ${actionIconButton('duplicate', 'Dupliquer', `duplicatePS('${ps.id}')`)}
      ${actionIconButton('export', 'Exporter', `state.selectedPSId='${ps.id}';exportPSPDF()`)}
      ${actionIconButton('delete', 'Supprimer', `deletePS('${ps.id}')`, { variant: 'danger' })}
    `,
    selectedId: state.selectedPSId
  });
}

function handlePSImageFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const imgEl = document.getElementById('psImage');
    const imgDataEl = document.getElementById('psImageData');
    const imgMeta = document.getElementById('psImageMeta');
    if (imgEl) imgEl.value = '';
    if (imgDataEl) imgDataEl.value = r.result;
    if (imgMeta) imgMeta.textContent = file.name || 'Visuel importé';
    updatePSImageThumb(r.result);
  };
  r.readAsDataURL(file);
}

function updatePSImageThumb(src) {
  const thumb = document.getElementById('psImageThumb');
  const meta = document.getElementById('psImageMeta');
  if (!thumb) return;
  if (src) {
    thumb.src = src;
    thumb.style.display = 'block';
    if (meta && !meta.textContent.trim()) meta.textContent = String(src).startsWith('data:') ? 'Visuel importé' : 'Visuel lié par URL';
  }
  else {
    thumb.removeAttribute('src');
    thumb.style.display = 'none';
    if (meta) meta.textContent = 'Aucun visuel importé';
  }
}

function resolvePSImageValue() {
  const imgData = (document.getElementById('psImageData')?.value || '').trim();
  if (imgData) return imgData;
  return (document.getElementById('psImage')?.value || '').trim();
}

function syncPSImageInputValue() {
  const imgEl = document.getElementById('psImage');
  const imgDataEl = document.getElementById('psImageData');
  const imgMeta = document.getElementById('psImageMeta');
  if (!imgEl || !imgDataEl) return;
  const value = (imgEl.value || '').trim();
  if (value.startsWith('data:')) {
    imgDataEl.value = value;
    imgEl.value = '';
    if (imgMeta) imgMeta.textContent = 'Visuel importé';
    updatePSImageThumb(value);
    return;
  }
  imgDataEl.value = '';
  if (imgMeta) imgMeta.textContent = value ? 'Visuel lié par URL' : 'Aucun visuel importé';
  updatePSImageThumb(value);
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
    if (recStatus) recStatus.textContent = 'Enregistrement terminé';
    if (recBtn) recBtn.textContent = 'Enregistrer en direct';
    if (stopBtn) stopBtn.style.display = 'none';
  };
  psMediaRecorder.start();
  const recStatus = document.getElementById('psRecordStatus');
  const recBtn = document.getElementById('psRecordBtn');
  const stopBtn = document.getElementById('psStopBtn');
  if (recStatus) recStatus.textContent = 'Enregistrement en cours…';
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
  if (psImageEl) psImageEl.oninput = () => syncPSImageInputValue();
  if (toolLogoFile) toolLogoFile.onchange = () => handleToolLogoFile(toolLogoFile.files[0]);
  if (toolLogoEl) toolLogoEl.oninput = () => updateToolThumb(toolLogoEl.value.trim());
}

// Export PS PDF

async function exportPSDocx() {
  const ps = state.selectedPSId ? byId(state.ps, state.selectedPSId) : null;
  if (!ps) {
    showToast('Sélectionnez un point de situation.', 'error');
    return;
  }
  try {
    const event = byId(state.events, ps.eventId);
    const { zip, doc } = await loadDocxDocument(ps.format === 'focus' ? 'psFocus' : 'psDetail');
    const docDate = ps.updatedAt ? new Date(ps.updatedAt) : new Date();
    const bilan = ps.bilan || {};
    const details = buildPSDocxDetails(ps);
    replacePlaceholderText(doc, '[num]', String(ps.number || ''), true);
    replacePlaceholderText(doc, '[Titre évènement]', ps.title || getEventTitle(ps.eventId) || '', true);
    if (ps.format === 'focus') {
      replacePlaceholderText(doc, '[Date]', docDate.toLocaleDateString('fr-FR'), false);
      replacePlaceholderText(doc, '[Heure]', docDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), false);
      replacePlaceholderText(doc, '[Statut]', ps.status || '', false);
      replacePlaceholderText(doc, '[Classification]', ps.classification || '', false);
      replacePlaceholderText(doc, '[Auteur]', ps.author || 'SIRACEDPC', false);
      replacePlaceholderText(doc, '[ID]', event?.synergi || '', false);
      replacePlaceholderSequence(doc, '[Détail]', [
        ps.situation || '',
        ps.attention ?? ps.points ?? '',
        ps.means ?? ps.moyens ?? '',
        ps.measures ?? ps.mesures ?? '',
        ps.communication || '',
        ps.transcript || bilan.notes || ''
      ]);
      try {
        const inserted = await replacePlaceholderWithDocxImage(zip, doc, '[Visuel]', ps.image, {
          label: 'Visuel PS',
          caption: ps.imageCaption || '',
          emptyText: 'Aucun visuel joint',
          maxWidthPx: 290,
          maxHeightPx: 210
        });
        if (!inserted && !ps.image) {
          replacePlaceholderText(doc, '[Visuel]', 'Aucun visuel joint', false);
        }
      } catch (imageError) {
        replacePlaceholderText(doc, '[Visuel]', ps.imageCaption || 'Visuel non intégré', false);
        console.warn('Insertion du visuel PS impossible :', imageError);
      }
    } else {
      replacePlaceholderSequence(doc, '[Nbr]', [
        bilan.dcd ?? '0',
        bilan.ua ?? '0',
        bilan.ur ?? '0',
        bilan.impliques ?? '0'
      ]);
      replacePlaceholderText(doc, '[Détail]', details.join('\n\n') || 'Aucun détail renseigné.', true);
      try {
        await appendDocxImageSection(zip, doc, ps.image, {
          title: 'Visuel associé',
          label: 'Visuel PS',
          caption: ps.imageCaption || '',
          maxWidthPx: 420,
          maxHeightPx: 260
        });
      } catch (imageError) {
        console.warn('Ajout du visuel PS détaillé impossible :', imageError);
      }
    }
    await exportDocxBlob(saveDocxDocument(zip, doc), `ps-${slugify(ps.title || getEventTitle(ps.eventId) || `ps-${ps.number || 'sicod'}`)}.docx`);
    showToast('Point de situation exporté en DOCX.');
  } catch (error) {
    showToast(`Export DOCX impossible : ${error.message || String(error)}`, 'error');
  }
}

function exportPSPDF() {
  return exportPSDocx();
}


// ────────────────────────────────────────────────────────────────────────────
// 9. MODULE MESSAGES DE COMMANDEMENT
// ────────────────────────────────────────────────────────────────────────────

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
    mode: state.settings.eventUnifiedSignatureMode || state.settings.commandSignatureMode || state.settings.psSignatureMode || 'delegation',
    name: state.settings.eventUnifiedSignatureName || state.settings.commandSignatureName || state.settings.psSignatureName || 'Nicolas HAUPTMANN',
    role: state.settings.eventUnifiedSignatureRole || state.settings.commandSignatureRole || state.settings.psSignatureRole || 'le directeur de cabinet'
  };
}

function initCommandForm() {
  ensureCommandState();
  const cmdType = document.getElementById('cmdType');
  if (cmdType) cmdType.innerHTML = commandTypes.map(([label], i) => `<option value="${i}">${esc(label)}</option>`).join('');
  if (!isEventWorkspaceActive('command')) return;
  renderCommandList();
  if (!state.selectedCommandId && getActiveItems(state.commandMessages).length) {
    state.selectedCommandId = getActiveItems(state.commandMessages)[0].id;
  }
}


function getOpenEvents(){
  return getActiveItems(state.events).filter(e => e.status !== 'Archivé');
}
function populateCommandEventSelect(selectedEventId){
  const el = document.getElementById('cmdEvent');
  if(!el) return;
  const options = [['', 'Sélectionner un événement']].concat(
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
  if(!cmd || !cmd.eventId || cmd.status !== 'Diffusé') return;
  const e = byId(state.events, cmd.eventId);
  if(!e || e.status === 'Archivé') return;
  e.logEntries = Array.isArray(e.logEntries) ? e.logEntries : [];
  const existing = e.logEntries.find(item => item.commandMessageId === cmd.id);
  const payload = {
    id: existing?.id || uid('log'),
    commandMessageId: cmd.id,
    createdAt: cmd.updatedAt || cmd.createdAt || new Date().toISOString(),
    author: 'SIRACEDPC',
    title: `${cmd.typeLabel || 'Message de commandement'}${cmd.number ? ' n° ' + cmd.number : ''}`,
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
    holdPerimeter: '',
    plan: '',
    limitedDetail: '',
    sirenScenario: '',
    diffusionPerimeter: '',
    messageDetail: '',
    suivi: false,
    cod: false,
    pco: false,
    planActive: false,
    limited: false,
    siren: false,
    endAlertSignal: false,
    frAlert: false,
    exercise: false,
    services: getDefaultCommandServices()
  };
}

function normalizeCommandServiceFormServices(services) {
  const source = Array.isArray(services) ? services.filter((item) => String(item?.name || '').trim()) : [];
  if (!source.length) {
    return getDefaultCommandServices().map((item, index) => ({
      name: item.name || '',
      placeholder: `Service / entité ${index + 1}`,
      cod: !!item.cod,
      pco: !!item.pco
    }));
  }
  return source.slice(0, 16).map((item, index) => ({
    name: item.name || '',
    placeholder: `Service / entité ${index + 1}`,
    cod: !!item.cod,
    pco: !!item.pco
  }));
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
  document.getElementById('cmdHoldPerimeter').value = d.holdPerimeter || '';
  document.getElementById('cmdLimitedDetail').value = d.limitedDetail || '';
  document.getElementById('cmdSirenScenario').value = d.sirenScenario || '';
  document.getElementById('cmdDiffusionPerimeter').value = d.diffusionPerimeter || '';
  document.getElementById('cmdMessageDetail').value = d.messageDetail || '';
  document.getElementById('cmdSuivi').checked = !!d.suivi;
  document.getElementById('cmdCOD').checked = !!d.cod;
  document.getElementById('cmdPCO').checked = !!d.pco;
  document.getElementById('cmdPlanActive').checked = !!d.planActive;
  document.getElementById('cmdLimited').checked = !!d.limited;
  document.getElementById('cmdSiren').checked = !!d.siren;
  document.getElementById('cmdEndAlertSignal').checked = !!d.endAlertSignal;
  document.getElementById('cmdFrAlert').checked = !!d.frAlert;
  document.getElementById('cmdExercise').checked = !!d.exercise;
  state.services = normalizeCommandServiceFormServices(d.services && d.services.length ? d.services : defaultServices);
  renderServiceRows();
  document.getElementById('commandDialog').showModal();
  ['cmdDate','cmdTime','cmdType','cmdEvent','cmdStatus','cmdSite','cmdRef','cmdActivation','cmdPcoLocation','cmdHoldPerimeter','cmdLimitedDetail','cmdSirenScenario','cmdDiffusionPerimeter','cmdMessageDetail','cmdSuivi','cmdCOD','cmdPCO','cmdPlanActive','cmdLimited','cmdSiren','cmdEndAlertSignal','cmdFrAlert','cmdExercise']
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
  if (!ensureWriteAccess()) return;
  if (existing) Object.assign(existing, payload);
  else state.commandMessages.unshift(payload);
  state.selectedCommandId = id;
  injectCommandIntoEventLog(existing || payload);
  window.SICODCommand?.clearDraft?.();
  persist();
  document.getElementById('commandDialog').close();
  renderAll();
}

async function deleteSelectedCommand() {
  if (!state.selectedCommandId) { showToast('Sélectionnez un message de commandement', 'error'); return; }
  const record = byId(state.commandMessages, state.selectedCommandId);
  if (!record) return;
  if (!await confirmAsync('Supprimer ce message de commandement ?')) return;
  if (!ensureWriteAccess()) return;
  window.SICODDataModel?.archiveRecord(state.commandMessages, state.selectedCommandId);
  state.selectedCommandId = getActiveItems(state.commandMessages)[0]?.id || null;
  persist();
  renderAll();
}

function renderCommandList() {
  const eventFilter = state.currentEventId || null;
  let items = [...getActiveItems(state.commandMessages).filter(isLinkedToActiveEvent)]
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  if (state.selectedCommandId && !items.some((item) => item.id === state.selectedCommandId)) {
    state.selectedCommandId = null;
  }
  if (eventFilter) items = items.filter(i => i.eventId === eventFilter);
  renderOperationalTable({
    containerId: 'eventCommandList',
    emptyMessage: 'Aucun message de commandement. Créer un premier message.',
    emptyActionLabel: 'Ajouter',
    emptyActionHandler: 'openCommandForm()',
    searchValue: document.getElementById('eventCommandListSearch')?.value,
    items,
    sortKey: 'command',
    sortAccessors: {
      date: (item) => String(item.updatedAt || item.createdAt || ''),
      number: (item) => Number(item.number || 0),
      event: (item) => item.event || getEventTitle(item.eventId),
      status: (item) => item.status || ''
    },
    buildTitleCell: (item) => `<div class="event-title-block"><span class="event-label">Message ${esc(item.number || '')}</span><span class="table-meta">${esc(item.typeLabel || '')}</span></div>`,
    buildRowActions: (item) => `
      ${actionIconButton('edit', 'Modifier', `openCommandForm('${item.id}')`)}
      ${actionIconButton('duplicate', 'Dupliquer', `duplicateCommand('${item.id}')`)}
      ${actionIconButton('export', 'Exporter', `state.selectedCommandId='${item.id}';exportCommandPDF()`)}
      ${actionIconButton('delete', 'Supprimer', `deleteCommandById('${item.id}')`, { variant: 'danger' })}
    `,
    selectedId: state.selectedCommandId
  });
}

function duplicateCommand(id) {
  const src = byId(state.commandMessages, id);
  if (!src) return;
  if (!ensureWriteAccess()) return;
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
  showToast('Message de commandement dupliqué.');
}

async function deleteCommandById(id) {
  state.selectedCommandId = id;
  return deleteSelectedCommand();
}

function updateCommandServiceField(index, key, value) {
  if (!Array.isArray(state.services) || !state.services[index]) return;
  state.services[index][key] = value;
  window.SICODCommand?.saveDraft?.(getCommandData());
}

function addCommandServiceRow() {
  const currentCount = (state.services || []).length;
  if (currentCount >= 16) {
    showToast("Le modèle permet 16 services ou entités au maximum dans le formulaire.", 'info');
    return;
  }
  state.services.push({
    name: '',
    placeholder: `Service / entité ${currentCount + 1}`,
    cod: false,
    pco: false
  });
  renderServiceRows();
  window.SICODCommand?.saveDraft?.(getCommandData());
}

function removeCommandServiceRow(index) {
  if (!Array.isArray(state.services) || !state.services[index]) return;
  state.services.splice(index, 1);
  renderServiceRows();
  window.SICODCommand?.saveDraft?.(getCommandData());
}

function renderServiceRows() {
  const svcRows = document.getElementById('svcRows');
  if (!svcRows) return;
  const services = state.services || [];
  svcRows.innerHTML = `<div class="svc-matrix">
    <div class="svc-matrix-head">SERVICES/ ENTITES</div>
    <div class="svc-matrix-head svc-matrix-head--check">Présence en COD</div>
    <div class="svc-matrix-head svc-matrix-head--check">Présence au PCO</div>
    <div class="svc-matrix-head svc-matrix-head--action"></div>
    ${services.map((svc, i) => {
      const labelCell = `<input value="${esc(svc.name || '')}" placeholder="${esc(svc.placeholder || 'Service / entité')}" oninput="updateCommandServiceField(${i}, 'name', this.value)">`;
      const actionCell = `<div class="svc-matrix-action">${actionIconButton('delete', 'Supprimer ce service', `removeCommandServiceRow(${i})`, { variant: 'danger' })}</div>`;
      return `${labelCell}
        <label class="svc-matrix-check"><input type="checkbox" ${svc.cod ? 'checked' : ''} onchange="updateCommandServiceField(${i}, 'cod', this.checked)"></label>
        <label class="svc-matrix-check"><input type="checkbox" ${svc.pco ? 'checked' : ''} onchange="updateCommandServiceField(${i}, 'pco', this.checked)"></label>
        ${actionCell}`;
    }).join('')}
  </div>
  <div class="command-service-add">
    <button class="fr-btn secondary small" type="button" onclick="addCommandServiceRow()" ${services.length >= 16 ? 'disabled' : ''}>Ajouter un service</button>
  </div>`;
}

function normalizeCommandServiceName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function buildCommandServiceSlots(services) {
  const source = Array.isArray(services) ? services.filter((item) => String(item?.name || '').trim()) : [];
  const canonicalSlots = [
    { label: 'SDIS', aliases: ['SDIS'] },
    { label: 'PPD', aliases: ['PPD', 'PP13', 'PREFETDEPOLICE', 'PREFECTUREDEPOLICE'] },
    { label: 'BMPM', aliases: ['BMPM'] },
    { label: 'DIPN', aliases: ['DIPN', 'DDSP'] },
    { label: 'SAMU', aliases: ['SAMU'] },
    { label: 'GGD', aliases: ['GGD'] },
    { label: 'ARS', aliases: ['ARS'] },
    { label: 'CRS', aliases: ['CRS'] },
    { label: 'DDTM', aliases: ['DDTM'] },
    { label: 'DMD', aliases: ['DMD'] },
    { label: 'DREAL', aliases: ['DREAL'] },
    { label: 'METROPOLE', aliases: ['METROPOLE', 'METROPOLEAIXMARSEILLEPROVENCE'] }
  ];
  const consumed = new Set();
  const slots = canonicalSlots.map((slot) => {
    const match = source.find((item, index) => {
      if (consumed.has(index)) return false;
      const normalized = normalizeCommandServiceName(item.name);
      return slot.aliases.includes(normalized);
    });
    if (match) consumed.add(source.indexOf(match));
    return {
      label: slot.label === 'METROPOLE' ? 'MÉTROPOLE' : slot.label,
      name: match?.name || (slot.label === 'METROPOLE' ? 'MÉTROPOLE' : slot.label),
      cod: !!match?.cod,
      pco: !!match?.pco
    };
  });
  const extras = source.filter((item, index) => !consumed.has(index)).slice(0, 4);
  while (extras.length < 4) extras.push({ name: '', cod: false, pco: false });
  return {
    named: slots,
    extra: extras.map((item) => ({ name: item.name || '', cod: !!item.cod, pco: !!item.pco }))
  };
}

function normalizeCommandRowLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function replaceCommandRowCheckboxes(root, label, replacements) {
  const needle = normalizeCommandRowLabel(label);
  const row = findWordRows(root).find((entry) => normalizeCommandRowLabel(entry.textContent || '').includes(needle));
  if (!row) return false;
  replacePlaceholderSequence(row, '[X]', replacements);
  return true;
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
    holdPerimeter: document.getElementById('cmdHoldPerimeter')?.value || '',
    limitedDetail: document.getElementById('cmdLimitedDetail')?.value || '',
    sirenScenario: document.getElementById('cmdSirenScenario')?.value || '',
    diffusionPerimeter: document.getElementById('cmdDiffusionPerimeter')?.value || '',
    messageDetail: document.getElementById('cmdMessageDetail')?.value || '',
    suivi: document.getElementById('cmdSuivi')?.checked || false,
    cod: document.getElementById('cmdCOD')?.checked || false,
    pco: document.getElementById('cmdPCO')?.checked || false,
    planActive: document.getElementById('cmdPlanActive')?.checked || false,
    limited: document.getElementById('cmdLimited')?.checked || false,
    siren: document.getElementById('cmdSiren')?.checked || false,
    endAlertSignal: document.getElementById('cmdEndAlertSignal')?.checked || false,
    frAlert: document.getElementById('cmdFrAlert')?.checked || false,
    exercise: document.getElementById('cmdExercise')?.checked || false,
    services: (state.services || [])
      .map((service) => ({
        name: String(service.name || '').trim(),
        cod: !!service.cod,
        pco: !!service.pco
      }))
      .filter((service) => service.name)
  };
}

function exportCommandPDF() {
  const d = state.selectedCommandId ? byId(state.commandMessages, state.selectedCommandId) : null;
  if (!d) {
    showToast('Sélectionnez un message de commandement.', 'error');
    return;
  }
  (async () => {
    try {
      const { zip, doc } = await loadDocxDocument('commandMessage');
      const now = new Date();
      replacePlaceholderText(doc, '[date de génération]', now.toLocaleDateString('fr-FR'), true);
      replacePlaceholderText(doc, '[heure de génération]', now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), true);
      replacePlaceholderText(doc, '[Type de message]', d.typeLabel || '', true);
      replacePlaceholderText(doc, '[Évènement]', d.event || getEventTitle(d.eventId) || '', true);
      replacePlaceholderText(doc, '[Localisation]', d.site || '', true);
      replacePlaceholderText(doc, '[Message automatique]', d.autoText || '', true);
      replacePlaceholderText(doc, '[Disposition de référence]', d.reference || '', true);
      replacePlaceholderText(doc, '[heure]', d.activation || '', true);
      replacePlaceholderText(doc, '[Périmètre à tenir]', d.holdPerimeter || '', true);
      replacePlaceholderText(doc, '[Localisation du PCO]', d.pcoLocation || '', true);
      replacePlaceholderText(doc, '[Mesure]', d.limitedDetail || '', true);
      replacePlaceholderText(doc, '[Scénario, groupe, sirène]', d.sirenScenario || '', true);
      replacePlaceholderTextWithBreaks(doc, '[Détail du message]', d.messageDetail || '', true);
      replacePlaceholderText(doc, '[Périmètre de diffusion]', d.diffusionPerimeter || '', true);
      const serviceSlots = buildCommandServiceSlots(d.services || []);
      replaceCommandRowCheckboxes(doc, 'Activation d’une cellule de suivi', [mark(d.suivi)]);
      replaceCommandRowCheckboxes(doc, 'Activation du COD', [mark(d.cod)]);
      replaceCommandRowCheckboxes(doc, 'Activation du PCO', [mark(d.pco)]);
      replaceCommandRowCheckboxes(doc, 'Activation de la disposition de référence', [mark(d.planActive)]);
      replaceCommandRowCheckboxes(doc, 'Activation limitée à certaines mesures', [mark(d.limited)]);
      replaceCommandRowCheckboxes(doc, 'Activation des sirènes d’alerte', [mark(d.siren)]);
      replaceCommandRowCheckboxes(doc, 'Signal de fin d’alerte', [mark(d.endAlertSignal)]);
      replaceCommandRowCheckboxes(doc, 'Diffusion d’un message FR-Alert', [mark(d.frAlert)]);
      serviceSlots.named.forEach((service) => {
        replaceCommandRowCheckboxes(doc, service.label, [mark(service.cod), mark(service.pco)]);
      });
      const extraRows = findWordRows(doc).filter((row) => String(row.textContent || '').includes('[AUTRE]'));
      extraRows.forEach((row, index) => {
        const extra = serviceSlots.extra[index] || { name: '', cod: false, pco: false };
        replacePlaceholderText(row, '[AUTRE]', extra.name || '', false);
        replacePlaceholderSequence(row, '[X]', [mark(extra.cod), mark(extra.pco)]);
      });

      const exerciseToken = '[EXERCICE – EXERCICE – EXERCICE]';
      const exerciseBanner = d.exercise ? 'EXERCICE - EXERCICE - EXERCICE' : '';
      const headerDoc = await loadDocxXml(zip, 'word/header1.xml');
      replacePlaceholderText(headerDoc, exerciseToken, exerciseBanner, true);
      saveDocxXml(zip, 'word/header1.xml', headerDoc);
      const footerDoc = await loadDocxXml(zip, 'word/footer1.xml');
      replacePlaceholderText(footerDoc, exerciseToken, exerciseBanner, true);
      saveDocxXml(zip, 'word/footer1.xml', footerDoc);

      await exportDocxBlob(saveDocxDocument(zip, doc), `message-commandement-${slugify(d.event || d.typeLabel || 'document')}.docx`);
      showToast('Message de commandement exporté en DOCX.');
    } catch (error) {
      showToast(`Export DOCX impossible : ${error.message || String(error)}`, 'error');
    }
  })();
}

// ────────────────────────────────────────────────────────────────────────────
// 10. MODULE FICHES RÉFLEXES
// ────────────────────────────────────────────────────────────────────────────

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
    current.items.push(trimmed.replace(/^[-•]\s*/, ''));
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
  if (duplicate) { showToast('Une fiche avec ce code existe déjà.', 'error'); return; }
  if (!ensureWriteAccess()) return;
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
  if (!await confirmAsync(`Supprimer la fiche ${fiche.code} · ${fiche.title} ?`)) return;
  if (!ensureWriteAccess()) return;
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
      items.sort((a, b) => `${a.code} ${a.title}`.localeCompare(`${b.code} ${b.title}`, 'fr')).map(f => `<button class="fiche-link ${state.selectedFiche === f.code ? 'active' : ''}" onclick="selectFiche('${esc(f.code)}')">${esc(f.code)} · ${esc(f.title)}</button>`).join('')
    }</div>`
  ).join('') + (!q ? `<div class="group"><h3>Compléments</h3><button class="fiche-link ${state.selectedFiche === 'glossary' ? 'active' : ''}" onclick="selectFiche('glossary')">Glossaire</button></div>` : '');

  if (state.selectedFiche === 'glossary') {
    ficheContent.innerHTML = `<div class="fiche-toolbar"><button class="fr-btn small" type="button" onclick="openFicheForm()">Ajouter</button></div><h2>Glossaire</h2><div class="fiche-section"><ul>${glossary.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`;
    return;
  }

  const fiche = fiches.find(f => f.code === state.selectedFiche) || fiches[0];
  if (!fiche) {
    ficheContent.innerHTML = `<div class="fiche-toolbar"><button class="fr-btn small" type="button" onclick="openFicheForm()">Ajouter</button></div><p class="fiche-empty">Aucune fiche disponible.</p>`;
    return;
  }
  state.selectedFiche = fiche.code;
  ficheContent.innerHTML = `<div class="fiche-toolbar"><button class="fr-btn secondary small" type="button" onclick="openFicheForm('${esc(fiche.code)}')">Modifier</button><button class="fr-btn danger small" type="button" onclick="deleteSelectedFiche()">Supprimer</button></div><h2>${esc(fiche.code)} · ${esc(fiche.title)}</h2><div class="fiche-meta"><span><strong>Famille :</strong> ${esc(fiche.family)}</span></div>${
    fiche.sections.map(sec => `<section class="fiche-section"><h3>${esc(sec.heading)}</h3><ul>${(sec.items || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul></section>`).join('')
  }`;
}

function selectFiche(code) {
  state.selectedFiche = code;
  renderFiches();
}

function exportAllFichesPDF() {
  const fiches = getReflexFiches();
  if (!fiches.length) { showToast('Aucune fiche à exporter.', 'error'); return; }
  return (async () => {
    try {
      const JSZip = ensureDocxEngine();
      const response = await fetch(DOCX_TEMPLATE_FILES.ficheReflexe, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Modèle introuvable (${response.status})`);
      }
      const templateBuffer = await response.arrayBuffer();
      const archive = new JSZip();
      for (const fiche of fiches) {
        const templateZip = await JSZip.loadAsync(templateBuffer.slice(0));
        const xml = await templateZip.file('word/document.xml').async('string');
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        replacePlaceholderText(doc, '[date de génération]', new Date().toLocaleDateString('fr-FR'), true);
        replacePlaceholderText(doc, '[Titre de la fiche]', `${fiche.code || ''} - ${fiche.title || ''}`.trim(), true);
        const body = findWordBody(doc);
        const paragraphs = findWordParagraphs(body);
        const headingTemplate = paragraphs.find((p) => /\[Titre section/i.test(p.textContent || ''));
        const itemTemplate = paragraphs.find((p) => /\[Element/i.test(p.textContent || ''));
        if (headingTemplate && itemTemplate) {
          const parent = headingTemplate.parentNode;
          const anchor = headingTemplate;
          (fiche.sections || []).forEach((section) => {
            const headingClone = headingTemplate.cloneNode(true);
            ['[Titre section A]', '[Titre section B]', '[Titre section X]'].forEach((placeholder) => replacePlaceholderText(headingClone, placeholder, section.heading || 'Contenu', false));
            parent.insertBefore(headingClone, anchor);
            (section.items || []).forEach((item) => {
              const itemClone = itemTemplate.cloneNode(true);
              ['[Element A]', '[Element B]', '[Element X]'].forEach((placeholder) => replacePlaceholderText(itemClone, placeholder, item || '', false));
              parent.insertBefore(itemClone, anchor);
            });
          });
          findWordParagraphs(body)
            .filter((p) => /\[(Titre section|Element)/i.test(p.textContent || ''))
            .forEach((p) => p.parentNode?.removeChild(p));
        }
        templateZip.file('word/document.xml', new XMLSerializer().serializeToString(doc));
        const content = await templateZip.generateAsync({ type: 'uint8array', mimeType: DOCX_MIME });
        archive.file(`${slugify(`${fiche.code || 'fiche'}-${fiche.title || 'reflexe'}`)}.docx`, content);
      }
      const archiveBlob = await archive.generateAsync({ type: 'blob', mimeType: ZIP_MIME });
      downloadBlob(archiveBlob, 'fiches-reflexes-docx.zip');
      showToast('Fiches réflexes exportées en archive ZIP.');
    } catch (error) {
      showToast(`Export DOCX impossible : ${error.message || String(error)}`, 'error');
    }
  })();
}

// ────────────────────────────────────────────────────────────────────────────
// 11. MODULE ANNUAIRE
// ────────────────────────────────────────────────────────────────────────────

function triggerContactImport() {
  const el = document.getElementById('contactImportFile');
  if (el) { el.value = ''; el.click(); }
}

function formatContactFullName(contact) {
  const lastName = String(contact?.name || '').trim();
  const firstName = String(contact?.firstName || '').trim();
  return [lastName, firstName].filter(Boolean).join(' ') || lastName || firstName || '—';
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
  document.getElementById('contactFirstName').value = c?.firstName || '';
  document.getElementById('contactPhone1').value = c?.phone1 || '';
  document.getElementById('contactPhone2').value = c?.phone2 || '';
  document.getElementById('contactEmail1').value = c?.email1 || '';
  document.getElementById('contactEmail2').value = c?.email2 || '';
  const deleteBtn = document.getElementById('contactDeleteBtn');
  if (deleteBtn) deleteBtn.style.display = c?.id ? '' : 'none';
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
    firstName: document.getElementById('contactFirstName').value.trim(),
    phone1: document.getElementById('contactPhone1').value.trim(),
    phone2: document.getElementById('contactPhone2').value.trim(),
    email1: document.getElementById('contactEmail1').value.trim(),
    email2: document.getElementById('contactEmail2').value.trim()
  };
  if (!data.name) { showToast('Le nom du contact est requis.', 'error'); return; }
  if (!ensureWriteAccess()) return;
  if (existing) Object.assign(existing, data);
  else state.contacts.push(data);
  persist();
  document.getElementById('contactDialog').close();
  renderDirectory();
}

async function deleteContact(id) {
  if (!await confirmAsync('Supprimer ce contact ?')) return;
  if (!ensureWriteAccess()) return;
  window.SICODDataModel?.archiveRecord(state.contacts, id);
  getSelectionSet('contacts').delete(id);
  persist();
  renderDirectory();
}

async function deleteContactFromDialog() {
  const id = document.getElementById('contactId')?.value || '';
  if (!id) return;
  await deleteContact(id);
  document.getElementById('contactDialog')?.close();
}

function renderDirectory() {
  const directoryList = document.getElementById('directoryList');
  if (!directoryList) return;
  const q = (document.getElementById('directorySearch')?.value || '').toLowerCase().trim();
  const groups = getDynamicList('directoryGroups');
  const contacts = getActiveItems(state.contacts).filter(c => !q || [c.group, c.entity, c.function, c.name, c.firstName, c.phone1, c.phone2, c.email1, c.email2].join(' ').toLowerCase().includes(q));
  sanitizeSelection('contacts', contacts.map((c) => c.id));
  const countEl = document.getElementById('directoryCount');
  if (countEl) countEl.textContent = `${contacts.length} contact(s)`;

  const groupBlocks = groups.map(group => {
    const items = contacts.filter(c => (c.group || '') === group);
    if (!items.length) return '';
    const sortedItems = sortItems(items, 'directory', 'entity', 'asc', {
      entity: (c) => c.entity || '',
      function: (c) => c.function || '',
      name: (c) => formatContactFullName(c),
      phone1: (c) => c.phone1 || '',
      email1: (c) => c.email1 || ''
    });
    const groupIds = sortedItems.map((c) => c.id);
    return `<div class="card directory-group">
      <div class="card-header"><h2 class="card-title">${esc(group)}</h2></div>
      <div class="card-body"><table class="table directory-table"><thead><tr><th class="table-select-col">${buildSelectionHeaderCheckbox('contacts', groupIds, 'renderDirectory')}</th>${sortableTh('directory','entity','Entité','entity','asc')}${sortableTh('directory','function','Fonction','entity','asc')}${sortableTh('directory','name','Nom','entity','asc')}${sortableTh('directory','phone1','Téléphones','entity','asc')}${sortableTh('directory','email1','E-mails','entity','asc')}</tr></thead><tbody>${
        sortedItems.map(c => `<tr class="table-row-clickable ${isSelectionChecked('contacts', c.id) ? 'is-selected' : ''}" tabindex="0" role="button" onclick="handleSelectableRowClick(event, () => openContactForm('${c.id}'))" onkeydown="handleTableRowKey(event, () => openContactForm('${c.id}'))">
          <td class="table-select-col">${buildSelectionRowCheckbox('contacts', c.id, 'renderDirectory')}</td><td>${esc(c.entity||'')}</td><td>${esc(c.function||'')}</td><td>${esc(formatContactFullName(c))}</td>
          <td><div class="table-stack"><span>${esc(c.phone1||'—')}</span>${c.phone2 ? `<span>${esc(c.phone2)}</span>` : ''}</div></td>
          <td><div class="table-stack"><span>${esc(c.email1||'—')}</span>${c.email2 ? `<span>${esc(c.email2)}</span>` : ''}</div></td>
        </tr>`).join('')
      }</tbody></table></div>
    </div>`;
  }).join('');
  directoryList.innerHTML = contacts.length
    ? `${buildSelectionToolbar('contacts', contacts.map((c) => c.id), 'contact', 'renderDirectory', 'deleteSelectedContacts')}${groupBlocks}`
    : '<p class="help">Aucun contact enregistré.</p>';
}

function exportContactsCSV() {
  const rows = [['Groupe','Entité','Fonction','Nom','Prénom','Téléphone 1','Téléphone 2','e-mail 1','e-mail 2'],
    ...getActiveItems(state.contacts).map(c => [c.group,c.entity||'',c.function||'',c.name,c.firstName||'',c.phone1||'',c.phone2||'',c.email1||'',c.email2||''])];
  downloadCSV('annuaire.csv', rows);
}

function importContactsCSV(file) {
  if (!file) return;
  if (!ensureWriteAccess()) return;
  file.text()
    .then(text => {
      const rows = parseCsvRows(text);
      if (rows.length < 2) { showToast("Le fichier CSV d'annuaire est vide ou invalide.", 'error'); return; }
      const data = rows.slice(1);
      let imported = 0;
      data.forEach(cols => {
        const isExtendedFormat = cols.length >= 9;
        const isCurrentFormat = cols.length >= 8;
        const nameIndex = isCurrentFormat ? 3 : 1;
        if (!cols[nameIndex]) return;
        state.contacts.push({
          id: uid('ct'),
          group: cols[0] || getDynamicList('directoryGroups')[0],
          entity: isCurrentFormat ? (cols[1] || '') : '',
          function: isCurrentFormat ? (cols[2] || '') : '',
          name: cols[nameIndex] || '',
          firstName: isExtendedFormat ? (cols[4] || '') : '',
          phone1: cols[isCurrentFormat ? (isExtendedFormat ? 5 : 4) : 2] || '',
          phone2: cols[isCurrentFormat ? (isExtendedFormat ? 6 : 5) : 3] || '',
          email1: cols[isCurrentFormat ? (isExtendedFormat ? 7 : 6) : 4] || '',
          email2: cols[isCurrentFormat ? (isExtendedFormat ? 8 : 7) : 5] || ''
        });
        imported += 1;
      });
      if (!imported) { showToast("Aucun contact exploitable n'a été trouvé dans ce fichier CSV.", 'error'); return; }
      persist();
      renderDirectory();
      showToast(`Import CSV terminé : ${imported} contact(s) ajouté(s).`);
    })
    .catch((error) => {
      showToast(`Import CSV impossible : ${error.message || String(error)}`, 'error');
    });
}

function exportContactsPDF() {
  return (async () => {
    try {
      const { zip, doc } = await loadDocxDocument('annuaire');
      const body = findWordBody(doc);
      const allTables = findWordTables(body);
      const groupTableTemplate = allTables.find((table) => (table.textContent || '').includes('[GROUPE]'));
      const contactTableTemplate = allTables.find((table) => (table.textContent || '').includes('[Fonction]') && (table.textContent || '').includes('[Prénom NOM]'));
      const entityParagraphTemplate = findWordParagraphs(body).find((paragraph) => (paragraph.textContent || '').includes('[Entité]'));
      const sectPr = body.getElementsByTagNameNS(WORD_NS, 'sectPr')[0];
      if (!groupTableTemplate || !contactTableTemplate || !entityParagraphTemplate || !sectPr) {
        throw new Error("La maquette d'annuaire est incomplète.");
      }
      let cursor = groupTableTemplate;
      while (cursor && cursor !== sectPr) {
        const next = cursor.nextSibling;
        body.removeChild(cursor);
        cursor = next;
      }
      const sections = buildDirectoryDocxSections();
      sections.forEach((section) => {
        const groupTable = groupTableTemplate.cloneNode(true);
        replacePlaceholderText(groupTable, '[GROUPE]', section.group, true);
        body.insertBefore(groupTable, sectPr);
        section.entities.forEach((entity) => {
          const entityParagraph = entityParagraphTemplate.cloneNode(true);
          replacePlaceholderText(entityParagraph, '[Entité]', entity.name, true);
          body.insertBefore(entityParagraph, sectPr);
          const contactTable = contactTableTemplate.cloneNode(true);
          replaceRowsMatchingTextInTable(contactTable, '[Fonction]', entity.contacts, (row, item) => {
            replacePlaceholderText(row, '[Fonction]', item.fonction || '—', false);
            replacePlaceholderText(row, '[Prénom NOM]', item.identity || '—', false);
            replacePlaceholderText(row, '[tel1]', item.tel1 || '—', false);
            replacePlaceholderText(row, '[tel2]', item.tel2 || '', false);
            replacePlaceholderText(row, '[e-mail1]', item.email1 || '—', false);
            replacePlaceholderText(row, '[e-mail2]', item.email2 || '', false);
          });
          body.insertBefore(contactTable, sectPr);
        });
      });
      await exportDocxBlob(saveDocxDocument(zip, doc), 'annuaire.docx');
      showToast('Annuaire exporté en DOCX.');
    } catch (error) {
      showToast(`Export DOCX impossible : ${error.message || String(error)}`, 'error');
    }
  })();
}
// ────────────────────────────────────────────────────────────────────────────
// 12. MODULE OUTILS
// ────────────────────────────────────────────────────────────────────────────

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

function normalizeToolUrl(url) {
  try {
    return new URL(String(url || '').trim());
  } catch (error) {
    return null;
  }
}

function buildToolLogoCandidates(url, logo = '') {
  const candidates = [];
  const pushCandidate = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized || candidates.includes(normalized)) return;
    candidates.push(normalized);
  };
  pushCandidate(logo);
  const parsed = normalizeToolUrl(url);
  if (!parsed) return candidates;
  pushCandidate(`${parsed.origin}/favicon.ico`);
  pushCandidate(`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(parsed.href)}`);
  pushCandidate(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(parsed.hostname)}.ico`);
  return candidates;
}

function resolveToolLogoSrc(toolOrUrl, logo = '') {
  if (toolOrUrl && typeof toolOrUrl === 'object') {
    const candidates = buildToolLogoCandidates(toolOrUrl.url || '', toolOrUrl.logo || '');
    return candidates[0] || 'assets/icons/Icones/System/apps-2-line.svg';
  }
  const candidates = buildToolLogoCandidates(toolOrUrl, logo);
  return candidates[0] || 'assets/icons/Icones/System/apps-2-line.svg';
}

function buildToolLogoFallbackAttr(toolOrUrl, logo = '') {
  const candidates = toolOrUrl && typeof toolOrUrl === 'object'
    ? buildToolLogoCandidates(toolOrUrl.url || '', toolOrUrl.logo || '')
    : buildToolLogoCandidates(toolOrUrl, logo);
  return esc(JSON.stringify(candidates));
}

function handleToolLogoError(img, fallbackSources) {
  if (!img) return;
  let sources = [];
  if (Array.isArray(fallbackSources)) {
    sources = fallbackSources.slice();
  } else {
    try {
      sources = JSON.parse(img.dataset.fallbackSources || '[]');
    } catch (error) {
      sources = [];
    }
  }
  const current = String(img.currentSrc || img.src || '').trim();
  const next = sources.find((source) => String(source || '').trim() && String(source).trim() !== current);
  if (next) {
    img.dataset.fallbackSources = JSON.stringify(sources.filter((source) => source !== next));
    img.src = next;
    return;
  }
  img.onerror = null;
  img.src = 'assets/icons/Icones/System/apps-2-line.svg';
}

function updateToolThumb(src, url = '') {
  const thumb = document.getElementById('toolLogoThumb');
  if (!thumb) return;
  const resolvedUrl = String(url || document.getElementById('toolUrl')?.value || '').trim();
  const fallbackSources = buildToolLogoCandidates(resolvedUrl, src);
  const initialSrc = fallbackSources[0] || '';
  if (initialSrc) {
    thumb.dataset.fallbackSources = JSON.stringify(fallbackSources.slice(1));
    thumb.onerror = function() {
      handleToolLogoError(this);
    };
    thumb.src = initialSrc;
    thumb.style.display = 'block';
  } else {
    thumb.removeAttribute('src');
    thumb.style.display = 'none';
  }
}

function autoFillToolLogo() {
  const toolLogo = document.getElementById('toolLogo');
  const toolUrl = document.getElementById('toolUrl');
  if (!toolLogo || toolLogo.value.trim()) return;
  const guessed = guessFavicon(toolUrl?.value.trim() || '');
  if (guessed) { toolLogo.value = guessed; updateToolThumb(guessed, toolUrl?.value.trim() || ''); }
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
  updateToolThumb(logoVal, t?.url || '');
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
  if (!ensureWriteAccess()) return;
  if (existing) Object.assign(existing, data);
  else state.tools.unshift(data);
  persist();
  document.getElementById('toolDialog').close();
  renderTools();
}

async function deleteTool(id) {
  if (!await confirmAsync('Supprimer cet outil ?')) return;
  if (!ensureWriteAccess()) return;
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
    <div><strong>Description</strong><br>${esc(t.description || '—')}</div>
    <div><strong>Identifiant</strong><br>${esc(t.username || '—')}</div>
    <div><strong>Mot de passe</strong><br>${esc(t.password || '—')}</div>
    <div><strong>URL</strong><br>${esc(t.url || '—')}</div>`;
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
          <img class="tool-logo" src="${esc(resolveToolLogoSrc(t))}" alt="" data-fallback-sources="${buildToolLogoFallbackAttr(t)}" onerror="handleToolLogoError(this)">
          <h3 class="tool-title">${esc(t.name)}</h3>
        </div>
        <div class="tool-desc">${esc(t.description || '')}</div>
        <div class="tool-actions">
          <button class="fr-btn secondary small" type="button" onclick="showToolInfo('${t.id}')">Informations</button>
          <button class="fr-btn small" type="button" onclick="openToolAccess('${t.id}')">Accéder</button>
        </div>
      </div>`).join('')
    : '<p class="help">Aucun outil enregistré.</p>';
}

// ────────────────────────────────────────────────────────────────────────────
// 13. MODULE PLANIFICATION
// ────────────────────────────────────────────────────────────────────────────

function openPlanForm(id) {
  const p = id ? byId(state.planItems, id) : null;
  document.getElementById('planId').value = p?.id || '';
  setSelectOptions(document.getElementById('planType'), getDynamicList('planTypes'), p?.type);
  setSelectOptions(document.getElementById('planPriority'), getDynamicList('planPriorities'), p?.priority);
  setSelectOptions(document.getElementById('planRisk'), getDynamicList('planRiskTypes'), p?.risk);
  setSelectOptions(document.getElementById('planStatus'), getDynamicList('planStatuses'), p?.status);
  document.getElementById('planItem').value = p?.item || '';
  document.getElementById('planApproval').value = p?.approvalDate || '';
  document.getElementById('planExpiry').value = p?.expiryDate || resolvePlanExpiryDate(p) || '';
  document.getElementById('planObservation').value = p?.observation || '';
  document.getElementById('planUrl').value = p?.url || '';
  const deleteBtn = document.getElementById('planDeleteBtn');
  const accessBtn = document.getElementById('planAccessBtn');
  if (deleteBtn) deleteBtn.style.display = p?.id ? '' : 'none';
  if (accessBtn) accessBtn.style.display = p?.url ? '' : 'none';
  if (!p) syncPlanExpiryFromApproval(true);
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
    expiryDate: document.getElementById('planExpiry').value || shiftIsoDateByYears(document.getElementById('planApproval').value, 4),
    observation: document.getElementById('planObservation').value.trim(),
    url: document.getElementById('planUrl').value.trim()
  };
  if (!data.item) { showToast("L'item de planification est requis.", 'error'); return; }
  if (!ensureWriteAccess()) return;
  if (existing) Object.assign(existing, data);
  else state.planItems.unshift(data);
  persist();
  document.getElementById('planningDialog').close();
  renderPlanning();
}

function deletePlanItem(id) {
  if (!ensureWriteAccess()) return;
  window.SICODDataModel?.archiveRecord(state.planItems, id);
  getSelectionSet('planItems').delete(id);
  persist();
  renderPlanning();
}

async function deletePlanItemFromDialog() {
  const id = document.getElementById('planId')?.value || '';
  if (!id) return;
  if (!await confirmAsync('Supprimer cette planification ?')) return;
  deletePlanItem(id);
  document.getElementById('planningDialog')?.close();
}

function openPlanUrlFromDialog() {
  const url = document.getElementById('planUrl')?.value?.trim() || '';
  if (!url) return;
  window.open(url, '_blank', 'noopener');
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
  sanitizeSelection('planItems', items.map((p) => p.id));
  const ordered = sortItems(items, 'planning', 'approvalDate', 'desc', {
    type: (p) => p.type || '',
    risk: (p) => p.risk || '',
    item: (p) => p.item || '',
    priority: (p) => p.priority || '',
    status: (p) => p.status || '',
    approvalDate: (p) => p.approvalDate || '',
    observation: (p) => p.observation || ''
  });
  const orderedIds = ordered.map((p) => p.id);
  planningList.innerHTML = ordered.length
    ? `${buildSelectionToolbar('planItems', orderedIds, 'planification', 'renderPlanning', 'deleteSelectedPlanItems')}<div class="table-wrap"><table class="table planning-table"><thead><tr><th class="table-select-col">${buildSelectionHeaderCheckbox('planItems', orderedIds, 'renderPlanning')}</th>${sortableTh('planning','type','Type','approvalDate','desc')}${sortableTh('planning','risk','Risque','approvalDate','desc')}${sortableTh('planning','item','Item','approvalDate','desc')}${sortableTh('planning','priority','Priorité','approvalDate','desc')}${sortableTh('planning','status','Statut','approvalDate','desc')}${sortableTh('planning','approvalDate',"Date d'approbation",'approvalDate','desc')}${sortableTh('planning','observation','Observation','approvalDate','desc')}</tr></thead><tbody>${
      ordered.map(p => `<tr class="table-row-clickable ${isSelectionChecked('planItems', p.id) ? 'is-selected' : ''}" tabindex="0" role="button" onclick="handleSelectableRowClick(event, () => openPlanForm('${p.id}'))" onkeydown="handleTableRowKey(event, () => openPlanForm('${p.id}'))">
          <td class="table-select-col">${buildSelectionRowCheckbox('planItems', p.id, 'renderPlanning')}</td>
          <td>${esc(p.type || '')}</td>
          <td>${esc(p.risk || '')}</td>
          <td><div class="event-title-block"><span class="event-label">${esc(p.item || '')}</span><span class="table-meta">${p.url ? 'Lien Resana disponible' : ''}</span></div></td>
          <td>${esc(p.priority || '')}</td>
          <td>${badge(p.status || '')}</td>
          <td><div class="event-title-block"><span class="event-label">${esc(formatIsoDateForDisplay(p.approvalDate || ''))}</span><span class="table-meta">Expiration : ${esc(formatIsoDateForDisplay(resolvePlanExpiryDate(p) || ''))}</span></div></td>
          <td>${esc(p.observation || '')}</td>
        </tr>`).join('')
      }</tbody></table></div>`
    : (window.SICODUI?.setEmptyState?.('Aucune planification. Ajouter un premier item.', 'Ajouter', 'openPlanForm()') || '<p class="help">Aucun item de planification.</p>');

  if (planningSummary) {
    const counts = {};
    getDynamicList('planStatuses').forEach(s => counts[s] = items.filter(i => i.status === s).length);
    planningSummary.innerHTML = `<div class="kpis"><div class="kpi"><strong>${items.length}</strong><span>Total tous statuts</span></div>${getDynamicList('planStatuses').map(s => `<div class="kpi"><strong>${counts[s] || 0}</strong><span>${esc(s)}</span></div>`).join('')}</div>`;
  }

  ensurePlanningStatsUI();
  renderPlanningStats();
}

function exportPlanningCSV() {
  const rows = [['Type de plan','Risque','Item','Priorité','Statut',"Date d'approbation",'Observation'],
    ...getActiveItems(state.planItems).map(p => [p.type||'',p.risk||'',p.item||'',p.priority||'',p.status||'',p.approvalDate||'',p.observation||''])];
  downloadCSV('planification.csv', rows);
}

function exportPlanningPDF() {
  return (async () => {
    try {
      const { zip, doc } = await loadDocxDocument('planification');
      replaceRowsMatchingText(doc, '[Type]', buildPlanningDocxRows(), (row, item) => {
        replacePlaceholderText(row, '[Type]', item.type, false);
        replacePlaceholderText(row, '[Risque]', item.risk, false);
        replacePlaceholderText(row, '[Item]', item.item, false);
        replacePlaceholderText(row, '[P]', item.priority, false);
        replacePlaceholderText(row, '[Statut]', item.status, false);
        replacePlaceholderSequence(row, '[Date]', [item.approvalDate, item.expiryDate]);
        replacePlaceholderText(row, '[Detail]', item.observation, false);
      });
      await exportDocxBlob(saveDocxDocument(zip, doc), 'planification.docx');
      showToast('Planification exportée en DOCX.');
    } catch (error) {
      showToast(`Export DOCX impossible : ${error.message || String(error)}`, 'error');
    }
  })();
}

// ────────────────────────────────────────────────────────────────────────────
// 14. MODULE STATISTIQUES DE PLANIFICATION
// ────────────────────────────────────────────────────────────────────────────

function chartColor(i) {
  const palette = ['#000091','#6a6af4','#b34000','#18753c','#c9191e','#7a5c00','#5b3a99','#0063cb'];
  return palette[i % palette.length];
}

function buildBarChart(title, rows) {
  const clean = rows.filter(r => r && r.label);
  if (!clean.length) return `<div class="stats-card"><h3>${esc(title)}</h3><p class="chart-empty">Aucune donnée.</p></div>`;
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
  if (!clean.length) return `<div class="stats-card"><h3>${esc(title)}</h3><p class="chart-empty">Aucune donnée.</p></div>`;
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
  const risks = {}; items.forEach(i => { const k = (i.risk || 'Non renseigné').trim(); risks[k] = (risks[k] || 0) + 1; });
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
    ${buildDonutChart('Répartition par statut', s.statuses)}
    ${buildBarChart('Priorités', s.priorities)}
    ${buildBarChart('Typologies de risque les plus fréquentes', s.risks)}
    ${buildBarChart("Dates d'approbation par année", s.years)}
  </div>`;
}

function exportPlanningStatsCSV() {
  const s = getPlanningStatsData();
  const rows = [['Section','Libellé','Valeur']];
  [['Types',s.types],['Statuts',s.statuses],['Priorités',s.priorities],['Risques',s.risks],['Années',s.years]].forEach(([section,data]) => data.forEach(r => rows.push([section,r.label,r.value])));
  downloadCSV('planification-statistiques.csv', rows);
}

function exportPlanningStatsPDF() {
  return (async () => {
    try {
      const { zip, doc } = await loadDocxDocument('planificationStat');
      const now = new Date();
      const stats = getPlanningStatsData();
      replacePlaceholderText(doc, '[date de génération]', now.toLocaleDateString('fr-FR'), true);
      const tables = findWordTables(doc);
      const fillSimpleTable = (title, rows, labelPlaceholder) => {
        const table = tables.find((entry) => (entry.textContent || '').includes(title));
        if (!table) return;
        const data = rows.length ? rows : [{ label: 'Aucune donnée', value: 0 }];
        replaceRowsMatchingTextInTable(table, labelPlaceholder, data, (row, item) => {
          replacePlaceholderText(row, labelPlaceholder, item.label, false);
          replacePlaceholderText(row, '[nbr]', String(item.value), false);
        });
      };
      fillSimpleTable('Plans par type', stats.types, '[Type]');
      fillSimpleTable('Plans par statut', stats.statuses, '[Statut]');
      fillSimpleTable('Plans par typologie de risque', stats.risks, '[Risque]');
      fillSimpleTable("Plans par année d’approbation", stats.years, '[Année]');
      const priorityTable = tables.find((entry) => (entry.textContent || '').includes('Plans par priorité'));
      if (priorityTable) {
        const priorities = stats.priorities.length ? stats.priorities : [{ label: 'Aucune donnée', value: 0 }];
        const placeholders = ['[P1]', '[P2]', '[P3]', '[P4]'];
        priorities.slice(0, placeholders.length).forEach((item, index) => {
          replacePlaceholderText(priorityTable, placeholders[index], item.label, false);
          replacePlaceholderText(priorityTable, '[nbr]', String(item.value), false);
        });
        placeholders.slice(priorities.length).forEach((placeholder) => {
          replacePlaceholderText(priorityTable, placeholder, '', false);
          replacePlaceholderText(priorityTable, '[nbr]', '', false);
        });
      }
      await exportDocxBlob(saveDocxDocument(zip, doc), 'planification-statistiques.docx');
      showToast('Statistiques de planification exportées en DOCX.');
    } catch (error) {
      showToast(`Export DOCX impossible : ${error.message || String(error)}`, 'error');
    }
  })();
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
  doc.setTextColor(22,22,22); doc.text('Libellé', 16, y + 4.5); doc.text('Valeur', 173, y + 4.5, { align: 'center' }); y += 7;
  (data.length ? data : [{ label: 'Aucune donnée', value: 0 }]).forEach(r => {
    if (y > pageH - 12) { doc.addPage(); y = 15; }
    doc.setTextColor(22,22,22); doc.setDrawColor(180);
    doc.rect(12, y, 136, 7); doc.rect(148, y, 50, 7);
    doc.text(String(r.label), 16, y + 4.5, { maxWidth: 128 }); doc.text(String(r.value), 173, y + 4.5, { align: 'center' }); y += 7;
  });
  return y + 6;
}

function ensurePlanningStatsUI() {
  const page = document.getElementById('page-planning');
  const tabs = document.getElementById('planningSubtabs');
  if (!page || !tabs || tabs.dataset.ready === '1') return;
  const inner = page.querySelector('.page-inner');
  if (!inner) return;
  const cards = [...inner.querySelectorAll(':scope > .card')];
  tabs.innerHTML = `<button class="page-subtab active" type="button" onclick="showPlanningSection('overview')">Tableau de suivi</button><button class="page-subtab" type="button" onclick="showPlanningSection('stats')">Statistiques</button>`;
  tabs.dataset.ready = '1';
  const overview = document.createElement('div'); overview.id = 'planningOverview'; overview.className = 'page-subpanel active';
  cards.forEach(c => overview.appendChild(c));
  const stats = document.createElement('div'); stats.id = 'planningStats'; stats.className = 'page-subpanel';
  stats.innerHTML = `<div class="card"><div class="card-header"><h2 class="card-title">Statistiques</h2><div class="stats-toolbar"><button class="fr-btn secondary small" type="button" onclick="exportPlanningStatsPDF()">Exporter</button></div></div><div class="card-body" id="planningStatsBody"></div></div>`;
  inner.appendChild(overview); inner.appendChild(stats);
}

function handleTableRowKey(event, callback) {
  if (!event || typeof callback !== 'function') return;
  if (event.target?.closest?.('.table-select-col')) return;
  if (isInteractiveTableTarget(event.target)) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
}

function showPlanningSection(which) {
  document.querySelectorAll('#planningSubtabs .page-subtab').forEach((btn, idx) =>
    btn.classList.toggle('active', (which === 'overview' && idx === 0) || (which === 'stats' && idx === 1)));
  document.getElementById('planningOverview')?.classList.toggle('active', which === 'overview');
  document.getElementById('planningStats')?.classList.toggle('active', which === 'stats');
  if (which === 'stats') renderPlanningStats();
}

// ────────────────────────────────────────────────────────────────────────────
// 15. MODULE ASTREINTES
// ────────────────────────────────────────────────────────────────────────────

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
  const presetWeek = arguments[1] || '';
  const presetRole = arguments[2] ? decodeURIComponent(arguments[2]) : '';
  const roles = getCurrentDutyRoles();
  const initialRole = a?.role || presetRole || roles[0] || '';
  const roleSelect = document.getElementById('dutyRole');
  document.getElementById('dutyId').value = a?.id || '';
  setSelectOptions(roleSelect, roles, initialRole);
  if (roleSelect) roleSelect.onchange = () => syncDutyAgentOptions();
  syncDutyAgentOptions(a?.agent || '');
  const today = new Date();
  const defaultPeriod = buildDutyPeriods(today, today)[0];
  document.getElementById('dutyStart').value = a?.start || presetWeek || defaultPeriod?.startKey || toLocalISO(startOfMonday(today));
  document.getElementById('dutyNote').value = a?.note || '';
  const deleteBtn = document.getElementById('dutyDeleteBtn');
  if (deleteBtn) deleteBtn.style.display = a?.id ? '' : 'none';
  document.getElementById('dutyDialog').showModal();
}

function openDutyAvailabilityPreset(weekStart, role = '') {
  openDutyAvailabilityForm('', weekStart, role);
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
    end: '',
    note: document.getElementById('dutyNote').value.trim()
  };
  if (!data.agent || !data.role) { showToast("Sélectionnez un agent et un rôle d'astreinte.", 'error'); return; }
  if (!getEligibleDutyAgents(data.role).includes(data.agent)) { showToast("Cet agent n'est pas habilité pour ce rôle d'astreinte.", 'error'); return; }
  if (!data.start) { showToast("Définissez le début de la période d'astreinte.", 'error'); return; }
  const startDate = parseDateLocal(data.start);
  if (!startDate) { showToast("Définissez une période d'astreinte valide.", 'error'); return; }
  const periods = buildDutyPeriods(startDate, startDate);
  const period = periods.find((entry) => toLocalISO(entry.start) === toLocalISO(startDate)) || periods[0];
  data.start = period?.startKey || toLocalISO(startDate);
  data.end = period?.endKey || toLocalISO(nextWeekBoundary(startOfMonday(startDate)));
  data.carryHoliday = !!period?.carryHoliday;
  const duplicate = getValidDutyAvailabilities().find((item) =>
    item.id !== id &&
    String(item.agent || '').trim() === data.agent &&
    String(item.start || '').trim() === data.start
  );
  if (duplicate) {
    showToast("Cet agent a déjà une disponibilité enregistrée pour cette semaine.", 'error');
    return;
  }
  if (!ensureWriteAccess()) return;
  if (existing) Object.assign(existing, data);
  else state.dutyAvailabilities.push(data);
  regenerateDutyScheduleIfPresent();
  persist();
  document.getElementById('dutyDialog').close();
  renderDashboard();
  renderDutySchedule();
  renderDutyStats();
  renderDutyCalendar();
}

async function deleteDutyAvailabilityFromDialog() {
  const id = document.getElementById('dutyId')?.value || '';
  if (!id) return;
  if (!await confirmAsync('Supprimer cette disponibilité ?')) return;
  deleteDutyAvailability(id);
  document.getElementById('dutyDialog')?.close();
}

function deleteDutyAvailability(id) {
  if (!ensureWriteAccess()) return;
  window.SICODDataModel?.archiveRecord(state.dutyAvailabilities, id);
  regenerateDutyScheduleIfPresent();
  persist();
  renderDashboard();
  renderDutySchedule();
  renderDutyStats();
  renderDutyCalendar();
}

function getCurrentDutyRoles() {
  return getDynamicList('dutyRoles').filter(Boolean);
}

function getCurrentDutyAgents() {
  return getDynamicList('dutyAgents').filter(Boolean);
}

function getDutyRoleAgentMap() {
  const allAgents = getCurrentDutyAgents();
  const allowedAgents = new Set(allAgents);
  const raw = state.settings?.dutyRoleAgents && typeof state.settings.dutyRoleAgents === 'object'
    ? state.settings.dutyRoleAgents
    : {};
  const map = {};
  getCurrentDutyRoles().forEach((role) => {
    const configured = Array.isArray(raw[role]) ? raw[role].map((item) => String(item || '').trim()).filter(Boolean) : [];
    const filtered = configured.filter((agent, index) => allowedAgents.has(agent) && configured.indexOf(agent) === index);
    map[role] = filtered.length ? filtered : allAgents.slice();
  });
  return map;
}

function getEligibleDutyAgents(role) {
  const map = getDutyRoleAgentMap();
  return Array.isArray(map[role]) ? map[role].slice() : getCurrentDutyAgents();
}

function syncDutyAgentOptions(selectedAgent = '') {
  const role = document.getElementById('dutyRole')?.value || getCurrentDutyRoles()[0] || '';
  const eligibleAgents = getEligibleDutyAgents(role);
  const fallback = eligibleAgents.includes(selectedAgent) ? selectedAgent : (eligibleAgents[0] || '');
  setSelectOptions(document.getElementById('dutyAgent'), eligibleAgents, fallback);
}

function getValidDutyAvailabilities() {
  const allowedRoles = new Set(getCurrentDutyRoles());
  return getActiveItems(state.dutyAvailabilities).filter((item) =>
    item
      && allowedRoles.has(String(item.role || '').trim())
      && getEligibleDutyAgents(String(item.role || '').trim()).includes(String(item.agent || '').trim())
  );
}

function cleanupInvalidDutyAvailabilities() {
  const allowedRoles = new Set(getCurrentDutyRoles());
  let changed = false;
  getActiveItems(state.dutyAvailabilities).forEach((item) => {
    if (!item || (allowedRoles.has(item.role) && getEligibleDutyAgents(String(item.role || '').trim()).includes(String(item.agent || '').trim()))) return;
    window.SICODDataModel?.archiveRecord(state.dutyAvailabilities, item.id);
    changed = true;
  });
  if (changed) persist();
}

function renderDutyAvailabilityList() {
  const el = document.getElementById('dutyAvailabilityList');
  if (!el) return;
  el.innerHTML = '';
}

function renderDutyCalendar() {
  const dutyCalendar = document.getElementById('dutyCalendar');
  if (!dutyCalendar) return;

  const dutyMonth = document.getElementById('dutyMonth');
  const monthVal = dutyMonth?.value || todayISO().slice(0, 7);
  if (dutyMonth && !dutyMonth.value) dutyMonth.value = monthVal;
  cleanupInvalidDutyAvailabilities();

  const roles = getCurrentDutyRoles();
  const agents = getCurrentDutyAgents();
  setSelectOptions(document.getElementById('dutyRoleFilter'), ['', ...roles], document.getElementById('dutyRoleFilter')?.value || '');
  setSelectOptions(document.getElementById('dutyAgentFilter'), ['', ...agents], document.getElementById('dutyAgentFilter')?.value || '');

  const [year, month] = monthVal.split('-').map(Number);
  if (!year || !month) return;
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const periods = buildDutyPeriods(first, last);

  const filterRole = document.getElementById('dutyRoleFilter')?.value || '';
  const filterAgent = document.getElementById('dutyAgentFilter')?.value || '';

  const availabilityItems = getValidDutyAvailabilities();
  const role1 = roles[0] || 'Astreinte 1';
  const role2 = roles[1] || 'Astreinte 2';
  const weekRows = [];
  periods.forEach((period) => {
    const weekStart = period.start;
    const weekEnd = period.end;
    const weekKey = period.startKey;
    const entries = availabilityItems.filter((a) => {
      return String(a.start || '').trim() === weekKey
        && (!filterRole || a.role === filterRole)
        && (!filterAgent || a.agent === filterAgent);
    });
    const byRole = (role) => entries
      .filter((entry) => entry.role === role)
      .sort((a, b) => String(a.agent || '').localeCompare(String(b.agent || ''), 'fr'));
    const role1Entries = byRole(role1);
    const role2Entries = byRole(role2);
    const renderEntries = (items) => items.length
      ? `<div class="duty-week-list">${items.map((item) => `<button class="duty-week-pill" type="button" onclick="event.stopPropagation();openDutyAvailabilityForm('${item.id}')"><span class="duty-week-pill-name">${esc(item.agent || '')}</span></button>`).join('')}</div>`
      : '<span class="table-meta">Aucune disponibilité</span>';
    weekRows.push(`<tr>
      <td><button class="table-week-trigger" type="button" onclick="openDutyAvailabilityPreset('${weekKey}', '')"><div class="event-title-block"><span class="event-label">Semaine du ${esc(formatDateLocal(weekStart))}</span><span class="table-meta">au ${esc(formatDateLocal(weekEnd))}</span></div></button></td>
      <td class="duty-week-slot" onclick="openDutyAvailabilityPreset('${weekKey}', '${encodeURIComponent(role1)}')">${renderEntries(role1Entries)}</td>
      <td class="duty-week-slot" onclick="openDutyAvailabilityPreset('${weekKey}', '${encodeURIComponent(role2)}')">${renderEntries(role2Entries)}</td>
    </tr>`);
  });
  dutyCalendar.innerHTML = `<div class="table-wrap"><table class="table duty-week-table"><thead><tr><th>Semaine</th><th>${esc(role1)}</th><th>${esc(role2)}</th></tr></thead><tbody>${weekRows.join('')}</tbody></table></div>`;
  document.getElementById('dutyAvailabilityCard')?.remove();
}

function ensureDutySettingsUI() {
  const panel = document.querySelector('[data-settings-panel="duty"] .card-body');
  if (!panel) return;
  let block = document.getElementById('dutyRoleAgentSettings');
  if (!block) {
    block = document.createElement('div');
    block.id = 'dutyRoleAgentSettings';
    block.className = 'grid-2';
    block.style.marginTop = '1rem';
    panel.appendChild(block);
  }
  const roles = getCurrentDutyRoles();
  block.innerHTML = `
    <div>
      <label>${esc(`Agents habilités pour ${roles[0] || 'l’astreinte 1'}`)}</label>
      <textarea id="settingDutyRole1Agents" placeholder="Une ligne = un agent"></textarea>
    </div>
    <div>
      <label>${esc(`Agents habilités pour ${roles[1] || 'l’astreinte 2'}`)}</label>
      <textarea id="settingDutyRole2Agents" placeholder="Une ligne = un agent"></textarea>
    </div>
  `;
}

function buildDutySchedule(startInput, endInput) {
  cleanupInvalidDutyAvailabilities();
  const roles = getCurrentDutyRoles();
  const role1 = roles[0] || 'Astreinte 1', role2 = roles[1] || 'Astreinte 2';
  const availability = getValidDutyAvailabilities().map(a => ({ ...a, weekKey: String(a.start || '').trim() }));
  const periods = buildDutyPeriods(startInput, endInput);
  const roleAssignmentCount = {};
  const anyAssignmentCount = {};
  const lastAssignedWeek = {};
  const weekCandidates = periods.map((period) => {
    const weekKey = period.startKey;
    return {
      weekKey,
      [role1]: availability.filter((a) => a.role === role1 && a.weekKey === weekKey).map((a) => a.agent),
      [role2]: availability.filter((a) => a.role === role2 && a.weekKey === weekKey).map((a) => a.agent)
    };
  });
  const roleUniverse = {
    [role1]: Array.from(new Set(weekCandidates.flatMap((entry) => entry[role1] || []))),
    [role2]: Array.from(new Set(weekCandidates.flatMap((entry) => entry[role2] || [])))
  };

  const getRoleKey = (role, agent) => `${role}||${agent}`;
  const getFutureScarcityPenalty = (agent, weekIndex) => {
    let penalty = 0;
    for (let offset = 1; offset <= 2; offset += 1) {
      const next = weekCandidates[weekIndex + offset];
      if (!next) continue;
      [role1, role2].forEach((role) => {
        const candidates = next[role] || [];
        if (!candidates.includes(agent)) return;
        if (candidates.length <= 1) penalty += offset === 1 ? 4200 : 2200;
        else if (candidates.length === 2) penalty += offset === 1 ? 1500 : 800;
      });
    }
    return penalty;
  };

  const selectAgent = (role, week, weekIndex, usedThisWeek) => {
    const exact = availability.filter((a) => a.role === role && a.weekKey === week.startKey && !usedThisWeek.has(a.agent));
    const roleAgents = roleUniverse[role] || [];
    const minRoleCount = roleAgents.length
      ? Math.min(...roleAgents.map((agent) => roleAssignmentCount[getRoleKey(role, agent)] || 0))
      : 0;
    const pool = exact.map((a) => {
      const roleKey = getRoleKey(role, a.agent);
      const roleCount = roleAssignmentCount[roleKey] || 0;
      const anyCount = anyAssignmentCount[a.agent] || 0;
      const lastAny = lastAssignedWeek[a.agent];
      return {
        a,
        score:
          (roleCount - minRoleCount) * 5000 +
          roleCount * 1200 +
          anyCount * 180 +
          (lastAny === weekIndex - 1 ? 18000 : 0) +
          (lastAny === weekIndex - 2 ? 9000 : 0) +
          getFutureScarcityPenalty(a.agent, weekIndex)
      };
    }).sort((x, y) => x.score - y.score || x.a.agent.localeCompare(y.a.agent, 'fr'));
    if (!pool.length) return null;
    const chosen = pool[0].a;
    const roleKey = getRoleKey(role, chosen.agent);
    roleAssignmentCount[roleKey] = (roleAssignmentCount[roleKey] || 0) + 1;
    anyAssignmentCount[chosen.agent] = (anyAssignmentCount[chosen.agent] || 0) + 1;
    lastAssignedWeek[chosen.agent] = weekIndex;
    usedThisWeek.add(chosen.agent);
    return { name: chosen.agent };
  };

  state.dutySchedule = periods.map((week, idx) => {
    const used = new Set();
    const slots = [
      { key: 'agent1', role: role1, candidates: (weekCandidates[idx]?.[role1] || []).length },
      { key: 'agent2', role: role2, candidates: (weekCandidates[idx]?.[role2] || []).length }
    ].sort((a, b) => a.candidates - b.candidates || a.role.localeCompare(b.role, 'fr'));
    const assignment = {
      id: uid('week'),
      start: week.startKey,
      end: week.endKey,
      carryHoliday: !!week.carryHoliday,
      agent1: null,
      agent2: null
    };
    slots.forEach((slot) => {
      assignment[slot.key] = selectAgent(slot.role, week, idx, used);
    });
    return assignment;
  });
}

function regenerateDutyScheduleIfPresent() {
  const currentRows = state.dutySchedule || [];
  if (!currentRows.length) return false;
  const startInput = parseDateLocal(currentRows[0]?.start || '');
  const endInput = parseDateLocal(currentRows[currentRows.length - 1]?.end || '');
  if (!startInput || !endInput || endInput < startInput) return false;
  state.dutySchedule = buildDutySchedule(startInput, endInput);
  return true;
}

function generateDutySchedule() {
  const startVal = document.getElementById('dutyPeriodStart')?.value || todayISO();
  const endVal = document.getElementById('dutyPeriodEnd')?.value || startVal;
  const startInput = parseDateLocal(startVal), endInput = parseDateLocal(endVal);
  if (!startInput || !endInput || endInput < startInput) { showToast('Définissez une période de planning valide.', 'error'); return; }

  state.dutySchedule = buildDutySchedule(startInput, endInput);
  persist();
  renderDashboard();
  renderDutySchedule();
  renderDutyStats();
}

function renderDutySchedule() {
  const el = document.getElementById('dutyScheduleList');
  if (!el) return;
  const rows = state.dutySchedule || [];
  const roles = getCurrentDutyRoles();
  const role1 = roles[0] || 'Astreinte 1', role2 = roles[1] || 'Astreinte 2';
  const activeAvailabilities = getValidDutyAvailabilities().map(a => ({ ...a, weekKey: String(a.start || '').trim() }));

  el.innerHTML = rows.length
    ? `<div class="week-list">${rows.map((w, i) => {
        const exactAgentsForRole = (role) => ['', ...new Set(activeAvailabilities
          .filter((a) => a.role === role && a.weekKey === String(w.start || '').trim())
          .map((a) => a.agent)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'fr')))];
        const agents1 = exactAgentsForRole(role1);
        const agents2 = exactAgentsForRole(role2);
        return `<div class="week-card">
        <strong>Semaine du ${formatDateLocal(parseDateLocal(w.start))} au ${formatDateLocal(parseDateLocal(w.end))}</strong>
        ${w.carryHoliday ? `<div class="table-meta">Prolongation jour férié</div>` : ''}
        <div class="grid-2" style="margin-top:.75rem">
          <div class="week-assignment"><div class="help">${esc(role1)}</div><select onchange="updateDutyAssignment(${i},'agent1',this.value)">${agents1.map(name => `<option value="${esc(name)}" ${(w.agent1?.name||'')===name?'selected':''}>${esc(name||'Aucun agent disponible')}</option>`).join('')}</select></div>
          <div class="week-assignment"><div class="help">${esc(role2)}</div><select onchange="updateDutyAssignment(${i},'agent2',this.value)">${agents2.map(name => `<option value="${esc(name)}" ${(w.agent2?.name||'')===name?'selected':''}>${esc(name||'Aucun agent disponible')}</option>`).join('')}</select></div>
        </div>
      </div>`;
      }).join('')}</div>`
    : '<p class="help">Aucun planning généré.</p>';

  ensureDutyStatsUI();
  renderDutyStats();
}

function updateDutyAssignment(index, key, value) {
  if (!state.dutySchedule?.[index]) return;
  const row = state.dutySchedule[index];
  const role = key === 'agent1' ? (getCurrentDutyRoles()[0] || 'Astreinte 1') : (getCurrentDutyRoles()[1] || 'Astreinte 2');
  if (value && !getEligibleDutyAgents(role).includes(value)) {
    showToast("Cet agent n'est pas habilité pour ce rôle d'astreinte.", 'error');
    renderDutySchedule();
    return;
  }
  const otherKey = key === 'agent1' ? 'agent2' : 'agent1';
  if (value && row[otherKey]?.name === value) {
    showToast("Le même agent ne peut pas être affecté aux deux astreintes de la même semaine.", 'error');
    renderDutySchedule();
    return;
  }
  state.dutySchedule[index][key] = value ? { name: value } : null;
  persist();
  renderDashboard();
  renderDutySchedule();
}

async function exportDutyDocx() {
  if (!(state.dutySchedule || []).length) {
    showToast("Générez d'abord le planning d'astreinte.", 'error');
    return;
  }
  try {
    const { zip, doc } = await loadDocxDocument('astreinte');
    const now = new Date();
    const startValue = document.getElementById('dutyPeriodStart')?.value || state.dutySchedule[0]?.start || '';
    const endValue = document.getElementById('dutyPeriodEnd')?.value || state.dutySchedule[state.dutySchedule.length - 1]?.end || '';
    const startDate = parseDateLocal(startValue);
    const endDate = parseDateLocal(endValue);
    replacePlaceholderText(doc, '[date de génération]', now.toLocaleDateString('fr-FR'), true);
    replacePlaceholderText(doc, '[date début]', startDate ? formatDateLocal(startDate) : startValue, true);
    replacePlaceholderText(doc, '[date fin]', endDate ? formatDateLocal(endDate) : endValue, true);
    replaceRowsMatchingText(doc, '[Prénom NOM]', buildDutyDocxRows(), (row, item) => {
      replacePlaceholderText(row, '[date début sem]', item.start, false);
      replacePlaceholderTextWithBreaks(row, '[date fin sem]', item.end, false);
      replacePlaceholderSequence(row, '[Prénom NOM]', [item.agent1, item.agent2]);
    });
    await exportDocxBlob(saveDocxDocument(zip, doc), 'planning-astreinte.docx');
    showToast('Planning d astreinte exporté en DOCX.');
  } catch (error) {
    showToast(`Export DOCX impossible : ${error.message || String(error)}`, 'error');
  }
}

function exportDutyPDF() {
  return exportDutyDocx();
}

// ────────────────────────────────────────────────────────────────────────────
// 16. MODULE STATISTIQUES ASTREINTES
// ────────────────────────────────────────────────────────────────────────────

function getDutyStatsData(year) {
  const yearStart = new Date(year, 0, 1, 12, 0, 0, 0);
  const yearEnd = new Date(year + 1, 0, 1, 12, 0, 0, 0);
  const rows = (state.dutySchedule || []).filter((w) => {
    const start = parseDateLocal(w.start || '');
    const end = parseDateLocal(w.end || '');
    return start && end && end > yearStart && start < yearEnd;
  });
  const roles = getDynamicList('dutyRoles');
  const role1 = roles[0] || 'Astreinte 1', role2 = roles[1] || 'Astreinte 2';
  const getDaysWithinYear = (row) => {
    const start = parseDateLocal(row.start || '');
    const end = parseDateLocal(row.end || '');
    if (!start || !end || end <= start) return 0;
    const overlapStart = start > yearStart ? start : yearStart;
    const overlapEnd = end < yearEnd ? end : yearEnd;
    if (overlapEnd <= overlapStart) return 0;
    return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000);
  };
  const count = getter => {
    const m = {};
    rows.forEach((w) => {
      const name = getter(w);
      const days = getDaysWithinYear(w);
      if (name && days > 0) m[name] = (m[name] || 0) + days;
    });
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
    ${buildBarChart(`${s.role1} — répartition annuelle`, s.a1)}
    ${buildBarChart(`${s.role2} — répartition annuelle`, s.a2)}
  </div>`;
}

function exportDutyStatsCSV() {
  const year = Number(document.getElementById('dutyStatsYear')?.value || new Date().getFullYear());
  const s = getDutyStatsData(year);
  const rows = [['Année','Rôle','Agent','Jours']];
  s.a1.forEach(r => rows.push([s.year, s.role1, r.label, r.value]));
  s.a2.forEach(r => rows.push([s.year, s.role2, r.label, r.value]));
  downloadCSV(`astreintes-statistiques-${s.year}.csv`, rows);
}

function exportDutyStatsPDF() {
  return (async () => {
    try {
      const year = Number(document.getElementById('dutyStatsYear')?.value || new Date().getFullYear());
      const { zip, doc } = await loadDocxDocument('astreinteStat');
      const now = new Date();
      const { role1Rows, role2Rows } = buildDutyStatsDocxRows(year);
      replacePlaceholderText(doc, '[date de génération]', now.toLocaleDateString('fr-FR'), true);
      replacePlaceholderText(doc, '[anneée]', String(year), true);
      replacePlaceholderText(doc, '[année]', String(year), true);
      const tables = findWordTables(doc).filter((table) => (table.textContent || '').includes('[Prénom NOM]'));
      if (tables[0]) {
        replaceRowsMatchingTextInTable(tables[0], '[Prénom NOM]', role1Rows, (row, item) => {
          replacePlaceholderText(row, '[Prénom NOM]', item.name, false);
          replacePlaceholderText(row, '[nbr jours]', String(item.days), false);
          replacePlaceholderText(row, '[nbr jours ]', String(item.days), false);
        });
      }
      if (tables[1]) {
        replaceRowsMatchingTextInTable(tables[1], '[Prénom NOM]', role2Rows, (row, item) => {
          replacePlaceholderText(row, '[Prénom NOM]', item.name, false);
          replacePlaceholderText(row, '[nbr jours]', String(item.days), false);
          replacePlaceholderText(row, '[nbr jours ]', String(item.days), false);
        });
      }
      await exportDocxBlob(saveDocxDocument(zip, doc), `astreintes-statistiques-${year}.docx`);
      showToast('Statistiques astreintes exportées en DOCX.');
    } catch (error) {
      showToast(`Export DOCX impossible : ${error.message || String(error)}`, 'error');
    }
  })();
}

function ensureDutyStatsUI() {
  const page = document.getElementById('page-duty');
  const tabs = document.getElementById('dutySubtabs');
  if (!page || !tabs || tabs.dataset.ready === '1') return;
  const inner = page.querySelector('.page-inner');
  if (!inner) return;
  const grids = [...inner.querySelectorAll(':scope > .planning-grid')];
  tabs.innerHTML = `<button class="page-subtab active" type="button" onclick="showDutySection('planner')">Planning</button><button class="page-subtab" type="button" onclick="showDutySection('stats')">Statistiques</button>`;
  tabs.dataset.ready = '1';
  const planner = document.createElement('div'); planner.id = 'dutyPlanner'; planner.className = 'page-subpanel active';
  grids.forEach(g => planner.appendChild(g));
  const stats = document.createElement('div'); stats.id = 'dutyStatsPanel'; stats.className = 'page-subpanel';
  stats.innerHTML = `<div class="card"><div class="card-header"><h2 class="card-title">Statistiques annuelles des astreintes</h2><div class="stats-toolbar"><div><label style="margin:0 0 .25rem">Année</label><input id="dutyStatsYear" type="number" min="2020" max="2100" style="width:8rem" onchange="renderDutyStats()"></div><button class="fr-btn secondary small" type="button" onclick="exportDutyStatsCSV()">Exporter CSV</button><button class="fr-btn secondary small" type="button" onclick="exportDutyStatsPDF()">Exporter</button></div></div><div class="card-body" id="dutyStatsBody"></div></div>`;
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

// ────────────────────────────────────────────────────────────────────────────
// 17. MODULE PARAMÈTRES
// ────────────────────────────────────────────────────────────────────────────

function showSettingsTab(tab) {
  if (tab === 'ps' || tab === 'command') tab = 'events';
  const restricted = tab !== 'general';
  if (restricted && !isCurrentUserAdmin()) {
    tab = 'general';
    showToast("Accès réservé aux administrateurs.", 'error');
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

async function refreshCurrentUserRights() {
  try {
    await window.SICODApi?.auth?.refreshRoles?.();
    const authState = window.SICODApi?.system?.getAuthState?.() || {};
    showToast(authState.isAdmin ? 'Droits administrateur activés.' : 'Droits actualisés : accès lecture.', authState.isAdmin ? 'success' : 'info');
    ensureSettingsNavigatorUI();
    ensureSystemSettingsUI();
    loadSettingsForm();
    if (authState.isAdmin) showSettingsTab('db');
  } catch (error) {
    showToast(`Actualisation des droits impossible : ${error.message || String(error)}`, 'error');
  }
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
    button.textContent = 'Base de données';
    button.onclick = () => showSettingsTab('db');
    const generalTab = tabs.querySelector('[data-settings-tab="general"]');
    if (generalTab?.nextSibling) tabs.insertBefore(button, generalTab.nextSibling);
    else tabs.appendChild(button);
  }
  if (!pageInner.querySelector('[data-settings-panel="db"]')) {
    const panel = document.createElement('div');
    panel.className = 'settings-panel';
    panel.dataset.settingsPanel = 'db';
    panel.innerHTML = `<div class="settings-grid database-settings-grid" id="databaseSettingsGrid"></div>`;
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
    wrapper.innerHTML = `<label for="settingsSectionSelect">Section des paramètres</label><select id="settingsSectionSelect"></select>`;
    tabs.parentNode.insertBefore(wrapper, tabs);
  }
  const select = wrapper.querySelector('select');
  const options = Array.from(tabs.querySelectorAll('.settings-tab'))
    .filter((btn) => !['ps', 'command'].includes(btn.dataset.settingsTab))
    .map(btn => ({
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
      if (text.includes('bannière du tableau de bord') || text.includes('joindre une bannière')) {
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
  wrap.innerHTML = `<button class="fr-btn" type="button" onclick="saveSettings()">Enregistrer les paramètres</button>`;
  pageInner.appendChild(wrap);
}

// ────────────────────────────────────────────────────────────────────────────
// 18. STYLES DYNAMIQUES (injected CSS pour les composants Stats/Branding)
// ────────────────────────────────────────────────────────────────────────────
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
  label.textContent = 'Base de données';
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
    button.textContent = 'Déconnexion';
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
  const fresh = normalizeRemoteStateSnapshot(snapshot);
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
  userAdminState.loaded = false;
  userAdminState.items = [];
  ensureStateIntegrity();
  applyTheme(state.settings.theme);
  refreshStorageStatus();

  return true;
}

async function restoreRemoteStateAfterLogin() {
  const remoteState = await hydrateRemoteStateAndReferences(() => window.SICODApi?.system?.hydrateState?.());
  if (remoteState.kind !== 'loaded') refreshStorageStatus();
}

function normalizeHydratedRemoteStateResult(result) {
  if (result && typeof result === 'object' && typeof result.kind === 'string') {
    return result;
  }
  if (result && typeof result === 'object') {
    return { kind: 'loaded', state: result };
  }
  return { kind: 'unavailable', state: null };
}

async function hydrateRemoteStateAndReferences(loadRemoteState) {
  const result = normalizeHydratedRemoteStateResult(await Promise.resolve(loadRemoteState?.()));
  if (result.kind === 'loaded' && result.state && typeof result.state === 'object') {
    applyRemoteStateSnapshot(result.state);
  }
  await hydrateReferenceCatalogFromSupabase();
  return result;
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message || 'Operation expirée.')), timeoutMs);
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
      'La connexion Supabase a expiré. Vérifie le réseau, le compte utilisateur ou le mot de passe.'
    );
    markSecurityActivity();
    refreshAuthGate();
    refreshStorageStatus();
    updateCloudStateStatus(`Connexion Supabase ouverte pour ${esc(email)}. Chargement de l état distant...`, 'success');
    updateAuthGateStatus('Connexion réussie', 'success');
    try {
      await withTimeout(
        restoreRemoteStateAfterLogin(),
        15000,
        'Le chargement de l état distant a expiré.'
      );
    } catch (error) {
      updateCloudStateStatus(`Connexion ouverte, mais chargement distant incomplet : ${esc(error.message || String(error))}`, 'warning');
    }
    renderAll();
    refreshAuthGate();
    refreshStorageStatus();
  } catch (error) {
    updateAuthGateStatus('E-mail ou mot de passe incorrect', 'warning');
    refreshAuthGate();
    refreshStorageStatus();
  }
}

async function logoutSupabaseSession() {
  try {
    await window.SICODApi?.auth?.signOut?.();
    updateCloudStateStatus('Session Supabase fermée. Le site repasse en mode verrouillé tant qu’aucune reconnexion n’est effectuée.', 'info');
  } catch (error) {
    updateCloudStateStatus(`Déconnexion Supabase impossible : ${esc(error.message || String(error))}`, 'warning');
  }
  clearLocalStateCache();
  markSecurityActivity();
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
  window.SICODPdfTemplates?.setHtmlTemplate(state, key, normalizeHtmlTemplateSourceForStorage(key, textarea.value || ''));
}

function loadSelectedHtmlTemplate() {
  const select = document.getElementById('settingHtmlTemplateKey');
  const textarea = document.getElementById('settingHtmlTemplateSource');
  if (!select || !textarea) return;
  ensureOperationalHtmlTemplates();
  const template = window.SICODPdfTemplates?.getHtmlTemplate(state, select.value);
  const normalized = normalizeHtmlTemplateSourceForStorage(template?.id || select.value, template?.html || '');
  if (template?.id && normalized !== template.html) {
    window.SICODPdfTemplates?.setHtmlTemplate(state, template.id, normalized);
  }
  textarea.value = normalized;
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
    showToast('Aucun modèle HTML sélectionné.', 'error');
    return;
  }
  downloadBlob(new Blob([template.html], { type: 'text/html;charset=utf-8' }), template.fileName || `${slugify(template.id || 'modele')}.html`);
  showToast('Modèle HTML exporté.');
}

function triggerHtmlTemplateImport() {
  document.getElementById('settingHtmlTemplateImport')?.click();
}

async function importSelectedHtmlTemplate(file) {
  if (!file) return;
  const select = document.getElementById('settingHtmlTemplateKey');
  const key = select?.value || '';
  if (!key) {
    showToast('Aucun modèle HTML cible n est sélectionné.', 'error');
    return;
  }
  try {
    const content = await file.text();
    if (!String(content || '').trim()) throw new Error('Le fichier HTML est vide.');
    window.SICODPdfTemplates?.setHtmlTemplate(state, key, normalizeHtmlTemplateSourceForStorage(key, content));
    loadSelectedHtmlTemplate();
    showToast('Modèle HTML importé.');
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
  showToast('Modèle HTML réinitialisé.');
}

function ensureHtmlTemplateSettingsCard() {
  const stack = document.querySelector('[data-settings-panel="exports"] .settings-stack');
  if (!stack || stack.querySelector('#htmlTemplateSettingsCard')) return;
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'htmlTemplateSettingsCard';
  card.innerHTML = `
    <div class="card-header"><h2 class="card-title">Maquettes HTML d'aperçu et d'export</h2></div>
    <div class="card-body">
      <div class="grid-2">
        <div>
          <label for="settingHtmlTemplateKey">Document</label>
          <select id="settingHtmlTemplateKey" onchange="onHtmlTemplateSelectionChange()"></select>
        </div>
        <div class="list-actions" style="align-self:end">
          <button class="fr-btn secondary small" type="button" onclick="exportSelectedHtmlTemplate()">Exporter HTML</button>
          <button class="fr-btn secondary small" type="button" onclick="triggerHtmlTemplateImport()">Importer HTML</button>
          <button class="fr-btn secondary small" type="button" onclick="resetSelectedHtmlTemplate()">Réinitialiser</button>
        </div>
      </div>
      <input id="settingHtmlTemplateImport" type="file" accept=".html,text/html" style="display:none" onchange="importSelectedHtmlTemplate(this.files[0])">
      <div style="margin-top:1rem">
        <label for="settingHtmlTemplateSource">Code HTML</label>
        <textarea id="settingHtmlTemplateSource" class="code-area" spellcheck="false"></textarea>
      </div>
      <p class="help">Ces maquettes HTML permettent d'importer, d'exporter et d'harmoniser les aperçus et les rendus PDF finaux à partir d'une source unique.</p>
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
          <p class="help">Ces réglages modifient simplement l habillage des exports sans toucher à la matrice du document.</p>
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
  return JSON.stringify(createPersistedStateSnapshot(state), null, 2);
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
  updateCloudStateStatus('Export JSON généré depuis l’état courant de la session.', 'success');
}

async function checkSupabaseState() {
  updateCloudStateStatus('Contrôle de Supabase en cours...', 'info');
  try {
    const remoteConfig = window.SICODApi.system.getRemoteConfig();
    if (remoteConfig.provider !== 'supabase' || !remoteConfig.enabled || !remoteConfig.supabaseUrl || !remoteConfig.supabaseAnonKey) {
      updateCloudStateStatus('Supabase n’est pas encore configuré dans les paramètres généraux.', 'warning');
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
      Support : Base de données<br>
      Utilisateur : ${esc(authState.email || 'non identifie')}<br>
      Modèles PDF : ${remoteTemplates.length}<br>
      Événements : ${counts.events} · PS : ${counts.ps} · Messages : ${counts.commandMessages} · Contacts : ${counts.contacts}
    `, 'success');
    refreshStorageStatus();
  
    return remoteStatePayload;
  } catch (error) {
    updateCloudStateStatus(`Contrôle Supabase impossible : ${esc(error.message || String(error))}`, 'warning');
    refreshStorageStatus();
    throw error;
  }
}

async function pushCurrentStateToSupabase() {
  updateCloudStateStatus('Envoi de l’état courant vers Supabase...', 'info');
  try {
    ensureStateIntegrity();
    await pushReferenceCatalogToSupabase();
    await window.SICODApi.system.pushRemoteState(createPersistedStateSnapshot(state));
    const counts = countStateRecords(state);
    updateCloudStateStatus(`
      <strong>Synchronisation terminée.</strong><br>
      Événements : ${counts.events} · PS : ${counts.ps} · Messages : ${counts.commandMessages} · Contacts : ${counts.contacts}
    `, 'success');
    refreshStorageStatus();
  
  } catch (error) {
    updateCloudStateStatus(`Synchronisation Supabase impossible : ${esc(error.message || String(error))}`, 'warning');
    refreshStorageStatus();
  }
}

async function reloadStateFromSupabase() {
  updateCloudStateStatus('Chargement de l’état Supabase en cours...', 'info');
  try {
    const payload = await window.SICODApi.system.getRemoteState();
    if (!payload?.state || typeof payload.state !== 'object') {
      updateCloudStateStatus('Supabase est joignable, mais aucun état n’est encore enregistré.', 'warning');
      refreshStorageStatus();
      return;
    }
    await hydrateRemoteStateAndReferences(() => payload.state);
    renderAll();
    const counts = countStateRecords(state);
    updateCloudStateStatus(`
      <strong>État Supabase rechargé.</strong><br>
      Événements : ${counts.events} · PS : ${counts.ps} · Messages : ${counts.commandMessages} · Contacts : ${counts.contacts}
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
      if (!parsed || typeof parsed !== 'object') throw new Error('Le fichier JSON ne contient pas un état valide.');
      await window.SICODApi.system.pushRemoteState(createPersistedStateSnapshot(parsed));
      const fresh = normalizeRemoteStateSnapshot(parsed);
      Object.keys(state).forEach((key) => delete state[key]);
      Object.assign(state, fresh);
      ensureStateIntegrity();
      await pushReferenceCatalogToSupabase();
      applyTheme(state.settings.theme);
      renderAll();
      refreshStorageStatus();
      const counts = countStateRecords(state);
      updateCloudStateStatus(`
        <strong>Import Supabase terminé.</strong><br>
        Événements : ${counts.events} · PS : ${counts.ps} · Messages : ${counts.commandMessages} · Contacts : ${counts.contacts}
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
    <div class="card-header"><h2 class="card-title">Base de données</h2></div>
    <div class="card-body">
      <div class="grid-2">
        <div><label>Fournisseur</label><input value="Supabase" readonly></div>
        <div><label>Accès</label><input value="${remoteConfig.enabled ? 'Authentification requise' : 'Configuration manquante'}" readonly></div>
        <div><label>URL Supabase</label><input value="${esc(remoteConfig.supabaseUrl || '')}" readonly></div>
        <div><label>Project ref</label><input value="${esc(remoteConfig.projectRef || '')}" readonly></div>
        <div><label>Rôle applicatif courant</label><input value="${esc(authState.role || 'lecture')}" readonly></div>
        <div><label>Table de référence des rôles</label><input value="public.app_user_roles" readonly></div>
        <div><label>Annuaire utilisateurs</label><input value="public.app_user_directory" readonly></div>
      </div>
      <div class="cloud-admin-grid">
        <button class="fr-btn secondary" type="button" onclick="checkSupabaseState()">Vérifier la connexion</button>
        <button class="fr-btn secondary" type="button" onclick="exportCurrentStateJson()">Exporter les données</button>
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
  const passwordPolicy = window.SICODApi?.auth?.getPasswordPolicy?.() || { minLength: 12 };
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'passwordSettingsCard';
  card.innerHTML = `
    <div class="card-header"><h2 class="card-title">Accès à l'application</h2></div>
    <div class="card-body">
      <div><label>Compte connecte</label><input value="${esc(authState.email || '')}" readonly></div>
      <div style="margin-top:1rem">
        <label>Rôle applicatif</label>
        <input id="currentUserRoleField" value="${esc(authState.role || 'lecture')}" readonly>
      </div>
      <div class="grid-2" style="margin-top:1rem">
        <div><label for="settingNewPassword">Nouveau mot de passe</label><input id="settingNewPassword" type="password" autocomplete="new-password"></div>
        <div><label for="settingConfirmPassword">Confirmation</label><input id="settingConfirmPassword" type="password" autocomplete="new-password"></div>
      </div>
      <p class="help">Laissez ces champs vides pour conserver le mot de passe actuel. Politique minimale : ${passwordPolicy.minLength} caractères, avec majuscule, minuscule, chiffre et caractère spécial.</p>
    </div>
  `;
  generalGrid.appendChild(card);
}

function ensureMergedEventSettingsUI() {
  const eventsTab = document.querySelector('.settings-tab[data-settings-tab="events"]');
  const psTab = document.querySelector('.settings-tab[data-settings-tab="ps"]');
  const commandTab = document.querySelector('.settings-tab[data-settings-tab="command"]');
  const eventsPanel = document.querySelector('[data-settings-panel="events"]');
  const psPanel = document.querySelector('[data-settings-panel="ps"]');
  const commandPanel = document.querySelector('[data-settings-panel="command"]');
  if (!eventsPanel || eventsPanel.dataset.mergedEventSettings === '1') return;
  if (eventsTab) eventsTab.textContent = 'Évènements';
  const movedCards = [];
  [psPanel, commandPanel].forEach((panel) => {
    Array.from(panel?.children || []).forEach((child) => movedCards.push(child));
  });
  movedCards.forEach((card) => eventsPanel.appendChild(card));
  psTab?.remove();
  commandTab?.remove();
  psPanel?.remove();
  commandPanel?.remove();
  ['settingPsSignatureMode','settingPsSignatureName','settingPsSignatureRole','settingCommandSignatureMode','settingCommandSignatureName','settingCommandSignatureRole','settingCommandPhone','settingCommandFax','settingCommandEmail','settingCommandAudioConf'].forEach((id) => {
    const field = document.getElementById(id);
    field?.closest('.grid-3')?.remove();
    field?.closest('.grid-2')?.remove();
  });
  eventsPanel.dataset.mergedEventSettings = '1';
}

function formatUserAdminRoleLabel(role) {
  if (role === 'admin') return 'Administrateur';
  if (role === 'redacteur') return 'Contributeur';
  return 'Lecteur';
}

function ensureUserAdminSettingsUI() {
  const targetGrid = document.getElementById('userAdminSettingsGrid') || document.querySelector('[data-settings-panel="users"] .settings-grid');
  if (!targetGrid) return;
  targetGrid.classList.add('user-admin-grid-full');
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
        <button class="fr-btn" type="button" onclick="openManagedUserDialog()">Ajouter un utilisateur</button>
        <button class="fr-btn secondary" type="button" onclick="loadUserAdminDirectory(true)">Actualiser</button>
      </div>
    </div>
    <div class="card-body">
      <div id="userAdminStatus" class="help">Chargement en attente.</div>
      <div id="userAdminList"></div>
    </div>
  `;
  ensureManagedUserDialog();
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
            ${sortableTh('users','user','Utilisateur','user','asc')}
            ${sortableTh('users','role','Rôle','user','asc')}
            ${sortableTh('users','lastSeen','Dernière activité','user','asc')}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${sortItems(items, 'users', 'user', 'asc', {
            user: (item) => item.displayName || item.email || '',
            role: (item) => formatUserAdminRoleLabel(item.roles?.includes('admin') ? 'admin' : (item.roles?.includes('redacteur') ? 'redacteur' : 'lecture')),
            lastSeen: (item) => item.lastSeenAt || ''
          }).map((item) => {
            const role = item.roles?.includes('admin')
              ? 'admin'
              : (item.roles?.includes('redacteur') ? 'redacteur' : 'lecture');
            const locked = item.userId === currentUserId;
            return `<tr>
              <td>
                <div class="event-title-block">
                  <span class="event-label">${esc(item.displayName || item.email || 'Utilisateur')}</span>
                  <span class="table-meta">${esc(item.email || '')}${locked ? ' · compte courant' : ''}</span>
                </div>
              </td>
              <td>${formatUserAdminRoleLabel(role)}</td>
              <td>${esc(item.lastSeenAt ? formatDateTimeValueFR(item.lastSeenAt) : 'Jamais')}</td>
              <td>
                <div class="list-actions">
                  ${actionIconButton('edit', 'Modifier le compte', `openManagedUserDialog('${esc(item.userId)}')`)}
                  ${actionIconButton('delete', 'Supprimer le compte', `deleteManagedUserAccount('${esc(item.userId)}')`, { variant: 'danger', disabled: locked })}
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

function resetManagedUserForm() {
  ['managedUserId', 'managedUserEmail', 'managedUserName', 'managedUserPassword'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const role = document.getElementById('managedUserRole');
  if (role) role.value = 'lecture';
  const title = document.getElementById('managedUserDialogTitle');
  if (title) title.textContent = 'Compte utilisateur';
}

function ensureManagedUserDialog() {
  if (document.getElementById('managedUserDialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'managedUserDialog';
  dialog.innerHTML = `
    <form method="dialog" class="card" style="width:min(32rem,calc(100vw - 2rem));max-width:calc(100vw - 2rem);margin:0">
      <div class="card-header">
        <h2 class="card-title" id="managedUserDialogTitle">Compte utilisateur</h2>
        <button class="fr-btn secondary small" type="button" onclick="closeManagedUserDialog()">Fermer</button>
      </div>
      <div class="card-body" style="overflow-x:hidden;overflow-y:auto;max-height:calc(100vh - 8rem)">
        <input id="managedUserId" type="hidden">
        <div class="grid-2">
          <div><label for="managedUserEmail">E-mail</label><input id="managedUserEmail" type="email" autocomplete="off"></div>
          <div><label for="managedUserName">Nom affiché</label><input id="managedUserName" autocomplete="off"></div>
          <div><label for="managedUserRole">Rôle</label><select id="managedUserRole"><option value="lecture">Lecteur</option><option value="redacteur">Contributeur</option><option value="admin">Administrateur</option></select></div>
          <div><label for="managedUserPassword">Mot de passe</label><input id="managedUserPassword" type="password" autocomplete="new-password" placeholder="Laisser vide pour conserver le mot de passe actuel"></div>
        </div>
        <p class="help">Mot de passe minimal : 12 caractères avec majuscule, minuscule, chiffre et caractère spécial. Il est requis à la création et facultatif en modification : si vous en saisissez un nouveau, il remplace immédiatement l'ancien mot de passe du compte.</p>
        <div class="tool-actions">
          <button class="fr-btn" type="button" onclick="saveManagedUserAccount()">Enregistrer</button>
        </div>
      </div>
    </form>
  `;
  document.body.appendChild(dialog);
}

function closeManagedUserDialog() {
  document.getElementById('managedUserDialog')?.close();
}

function openManagedUserDialog(userId = '') {
  ensureManagedUserDialog();
  resetManagedUserForm();
  const title = document.getElementById('managedUserDialogTitle');
  const item = userId ? userAdminState.items.find((entry) => entry.userId === userId) : null;
  if (item) {
    const role = item.roles?.includes('admin') ? 'admin' : (item.roles?.includes('redacteur') ? 'redacteur' : 'lecture');
    document.getElementById('managedUserId').value = item.userId || '';
    document.getElementById('managedUserEmail').value = item.email || '';
    document.getElementById('managedUserName').value = item.displayName || '';
    document.getElementById('managedUserRole').value = role;
    document.getElementById('managedUserPassword').value = '';
    if (title) title.textContent = 'Compte utilisateur';
  } else if (title) {
    title.textContent = 'Compte utilisateur';
  }
  document.getElementById('managedUserDialog')?.showModal();
}

async function deleteManagedUserAccount(userId) {
  const targetUserId = String(userId || '').trim();
  if (!targetUserId) return;
  const authState = window.SICODApi?.system?.getAuthState?.() || {};
  if (authState.userId === targetUserId) {
    showToast('Le compte connecté ne peut pas être supprimé ici.', 'error');
    return;
  }
  const item = userAdminState.items.find((entry) => entry.userId === targetUserId);
  const label = item?.displayName || item?.email || 'cet utilisateur';
  if (!await confirmAsync(`Supprimer ${label} de l'administration applicative ?`)) return;
  updateUserAdminStatus('Suppression du compte utilisateur...', 'info');
  try {
    await window.SICODApi?.system?.deleteManagedUser?.(targetUserId);
    userAdminState.items = userAdminState.items.filter((entry) => entry.userId !== targetUserId);
    renderUserAdminDirectory();
    updateUserAdminStatus('Compte utilisateur supprimé.', 'success');
    showToast('Compte utilisateur supprimé.');
  } catch (error) {
    updateUserAdminStatus(`Suppression impossible : ${error.message || String(error)}`, 'warning');
    showToast(`Compte non supprimé : ${error.message || String(error)}`, 'error');
  }
}

async function saveManagedUserAccount() {
  const userId = document.getElementById('managedUserId')?.value || '';
  const email = document.getElementById('managedUserEmail')?.value?.trim() || '';
  const displayName = document.getElementById('managedUserName')?.value?.trim() || '';
  const role = document.getElementById('managedUserRole')?.value || 'lecture';
  const password = document.getElementById('managedUserPassword')?.value || '';
  const existingItem = userAdminState.items.find((item) => item.userId === userId);
  if (!email) {
    showToast('Saisissez un e-mail utilisateur.', 'error');
    return;
  }
  if (!userId && !password) {
    showToast('Un mot de passe initial est requis pour créer un compte.', 'error');
    return;
  }
  if (!userId || password) {
    const validation = window.SICODApi?.auth?.validatePassword?.(password, { requireValue: !userId });
    if (validation && validation.ok === false) {
      showToast(validation.message, 'error');
      return;
    }
  }
  updateUserAdminStatus(userId ? 'Mise à jour du compte...' : 'Création du compte...', 'info');
  try {
    const saved = await window.SICODApi?.system?.upsertManagedUser?.({
      userId,
      email,
      displayName,
      role,
      password,
      lastSeenAt: existingItem?.lastSeenAt || new Date().toISOString()
    });
    const index = userAdminState.items.findIndex((item) => item.userId === saved.userId);
    const next = {
      userId: saved.userId,
      email: saved.email,
      displayName: saved.displayName,
      roles: saved.roles,
      lastSeenAt: existingItem?.lastSeenAt || new Date().toISOString()
    };
    if (index >= 0) userAdminState.items[index] = { ...userAdminState.items[index], ...next };
    else userAdminState.items.push(next);
    userAdminState.items.sort((a, b) => String(a.email || '').localeCompare(String(b.email || ''), 'fr'));
    resetManagedUserForm();
    closeManagedUserDialog();
    renderUserAdminDirectory();
    updateUserAdminStatus('Compte utilisateur enregistré.', 'success');
    showToast('Compte utilisateur enregistré.');
  } catch (error) {
    updateUserAdminStatus(`Enregistrement impossible : ${error.message || String(error)}`, 'warning');
    showToast(`Compte non enregistré : ${error.message || String(error)}`, 'error');
  }
}

function ensureExportSettingsCleanupUI() {
  const htmlHelp = document.querySelector('#htmlTemplateSettingsCard .help');
  if (htmlHelp) {
    htmlHelp.textContent = "Ces maquettes HTML sont les modèles actifs des aperçus et des exports PDF. Toute importation remplace immédiatement le rendu en vigueur pour le document sélectionné.";
  }
}

function ensureSettingsEnhancements() {
  ensureSettingsNavigatorUI();
  ensureSystemSettingsUI();
  ensureGeneralPasswordSettingsUI();
  ensureUserAdminSettingsUI();
  ensureMergedEventSettingsUI();
  ensureDutySettingsUI();
  ensureSettingsCleanupUI();
  ensureSettingsFooterActions();
  bindCloudStateImport();
}

function ensureEventSignatureSettingsUI() {
  const eventPanel = document.querySelector('[data-settings-panel="events"] .card-body');
  const psPanel = document.querySelector('[data-settings-panel="ps"] .card-body');
  const commandPanel = document.querySelector('[data-settings-panel="command"] .card-body');
  if (!eventPanel || document.getElementById('eventUnifiedSignatureMode')) return;
  eventPanel.insertAdjacentHTML('beforeend', `
    <div class="card settings-inline-card" style="margin-top:1rem">
      <div class="card-header"><h3 class="card-title">Signature unique des documents événementiels</h3></div>
      <div class="card-body">
        <p class="help">Cette signature s’applique à la main courante, aux points de situation et aux messages de commandement.</p>
        <div class="grid-3">
          <div>
            <label>Signature</label>
            <select id="eventUnifiedSignatureMode">
              <option value="prefet">Le préfet</option>
              <option value="delegation">Pour le préfet, par délégation</option>
            </select>
          </div>
          <div>
            <label>Nom du signataire</label>
            <input id="eventUnifiedSignatureName">
          </div>
          <div>
            <label>Fonction du signataire</label>
            <input id="eventUnifiedSignatureRole">
          </div>
        </div>
      </div>
    </div>
  `);
  const removeLegacySignatureBlock = (panel, ids) => {
    if (!panel) return;
    ids.forEach((id) => document.getElementById(id)?.closest('.grid-3')?.remove());
  };
  removeLegacySignatureBlock(psPanel, ['settingPsSignatureMode', 'settingPsSignatureName', 'settingPsSignatureRole']);
  removeLegacySignatureBlock(commandPanel, ['settingCommandSignatureMode', 'settingCommandSignatureName', 'settingCommandSignatureRole']);
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
  if (get('currentUserRoleField')) get('currentUserRoleField').value = authState.role || 'lecture';
  if (get('settingNewPassword')) get('settingNewPassword').value = '';
  if (get('settingConfirmPassword')) get('settingConfirmPassword').value = '';
  if (get('settingPsFormat')) get('settingPsFormat').value = state.settings.psFormat || 'detail';
  if (get('settingClassification')) get('settingClassification').value = state.settings.classification || 'Non protégé';
  if (get('settingAuthor')) get('settingAuthor').value = state.settings.author || 'SIRACEDPC';
  if (get('settingEventTypes')) get('settingEventTypes').value = getDynamicList('eventTypes').join('\n');
  if (get('settingCommandTypes')) get('settingCommandTypes').value = getDynamicList('commandTypes').join('\n');
  if (get('settingDirectoryGroups')) get('settingDirectoryGroups').value = getDynamicList('directoryGroups').join('\n');
  if (get('settingDirectoryEntities')) get('settingDirectoryEntities').value = getDynamicList('directoryEntities').join('\n');
  if (get('settingPlanTypes')) get('settingPlanTypes').value = getDynamicList('planTypes').join('\n');
  if (get('settingPlanRiskTypes')) get('settingPlanRiskTypes').value = getDynamicList('planRiskTypes').join('\n');
  if (get('settingPlanPriorities')) get('settingPlanPriorities').value = getDynamicList('planPriorities').join('\n');
  if (get('settingPlanStatuses')) get('settingPlanStatuses').value = getDynamicList('planStatuses').join('\n');
  if (get('settingDutyRoles')) get('settingDutyRoles').value = getDynamicList('dutyRoles').join('\n');
  if (get('settingDutyAgents')) get('settingDutyAgents').value = getDynamicList('dutyAgents').join('\n');
  const dutyRoleAgentMap = getDutyRoleAgentMap();
  const dutyRoles = getCurrentDutyRoles();
  if (get('settingDutyRole1Agents')) get('settingDutyRole1Agents').value = (dutyRoleAgentMap[dutyRoles[0] || ''] || []).join('\n');
  if (get('settingDutyRole2Agents')) get('settingDutyRole2Agents').value = (dutyRoleAgentMap[dutyRoles[1] || ''] || []).join('\n');
  if (get('settingReflexFamilies')) get('settingReflexFamilies').value = getDynamicList('reflexFamilies').join('\n');
  if (get('settingPlanExpiryRules')) get('settingPlanExpiryRules').value = Object.entries(state.settings.planExpiryYears || {}).map(([k, v]) => `${k} = ${v}`).join('\n');
  showSettingsTab(activeTab);
  refreshStorageStatus();
}

async function saveSettings() {
  const get = id => document.getElementById(id);
  const nextPassword = (get('settingNewPassword')?.value || '').trim();
  const confirmPassword = (get('settingConfirmPassword')?.value || '').trim();
  if (nextPassword || confirmPassword) {
    const validation = window.SICODApi?.auth?.validatePassword?.(nextPassword, { requireValue: true });
    if (validation && validation.ok === false) {
      showSettingsTab('general');
      showToast(validation.message, 'error');
      return;
    }
    if (nextPassword !== confirmPassword) {
      showSettingsTab('general');
      showToast('La confirmation du mot de passe ne correspond pas.', 'error');
      return;
    }
  }
  if (!ensureWriteAccess()) return;
  state.settings.theme = get('settingTheme')?.value || 'light';
  state.settings.dashboardBanner = '';
  state.settings.psFormat = get('settingPsFormat')?.value || 'detail';
  state.settings.classification = get('settingClassification')?.value || 'Non protégé';
  state.settings.author = (get('settingAuthor')?.value || '').trim() || 'SIRACEDPC';
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
  const nextDutyRoles = getCurrentDutyRoles();
  const nextDutyAgents = new Set(getCurrentDutyAgents());
  state.settings.dutyRoleAgents = {
    [nextDutyRoles[0] || 'Astreinte 1']: parseList('settingDutyRole1Agents').filter((agent, index, arr) => nextDutyAgents.has(agent) && arr.indexOf(agent) === index),
    [nextDutyRoles[1] || 'Astreinte 2']: parseList('settingDutyRole2Agents').filter((agent, index, arr) => nextDutyAgents.has(agent) && arr.indexOf(agent) === index)
  };
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
    refreshPlanExpiryDatesFromSettings();
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
  renderDutySchedule();
  renderPlanningStats();
  renderDutyStats();
  loadSettingsForm();
  showToast('Paramètres enregistrés.');
}

// ────────────────────────────────────────────────────────────────────────────
// 19. BOOTSTRAP — Initialisation, renderAll, intervalles
// ────────────────────────────────────────────────────────────────────────────

function renderAll() {
  if (isAuthLocked()) {
    const appLayout = document.getElementById('appLayout');
    if (appLayout) appLayout.hidden = true;
    refreshAuthGate();
    refreshStorageStatus();
    return;
  }
  renderDashboard();
  const activePage = getActivePageName();
  if (activePage === 'events') renderEvents();
  if (activePage === 'event-detail') renderEventDetail();
  if (activePage === 'event-archives') renderEventArchives();
  if (activePage === 'fiches') renderFiches();
  if (activePage === 'directory') renderDirectory();
  if (activePage === 'tools') renderTools();
  if (activePage === 'planning') renderPlanning();
  if (activePage === 'duty') {
    renderDutyCalendar();
    renderDutyAvailabilityList();
    renderDutySchedule();
  }
  if (activePage === 'settings') loadSettingsForm();
  bindPSMediaInputs();
  applyBrandAssets();
  refreshDashboardBanner();
  const appLayout = document.getElementById('appLayout');
  if (appLayout) appLayout.hidden = false;
  refreshAuthGate();
}

let appHiddenAt = 0;
let appResumePromise = null;
let lastAppResumeAt = 0;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_IDLE_WARNING_MS = 25 * 60 * 1000;
const SESSION_HEARTBEAT_MS = 5 * 60 * 1000;
let lastSecurityActivityAt = Date.now();
let lastIdleWarningAt = 0;
let lastSessionHeartbeatAt = 0;
let sessionSecurityMonitorStarted = false;

function markSecurityActivity() {
  lastSecurityActivityAt = Date.now();
  lastIdleWarningAt = 0;
}

async function runSessionSecurityTick() {
  const authState = window.SICODApi?.system?.getAuthState?.() || {};
  if (!authState.authenticated) {
    lastIdleWarningAt = 0;
    return;
  }
  const now = Date.now();
  const idleMs = now - lastSecurityActivityAt;
  if (!lastIdleWarningAt && idleMs >= SESSION_IDLE_WARNING_MS && idleMs < SESSION_IDLE_TIMEOUT_MS) {
    lastIdleWarningAt = now;
    showToast("Session bientôt fermée pour inactivité. Enregistrez vos actions en cours.", 'info');
  }
  if (idleMs >= SESSION_IDLE_TIMEOUT_MS) {
    showToast("Session fermée après 30 minutes d'inactivité.", 'info');
    await logoutSupabaseSession();
    return;
  }
  if (document.visibilityState === 'visible' && now - lastSessionHeartbeatAt >= SESSION_HEARTBEAT_MS) {
    lastSessionHeartbeatAt = now;
    try {
      await Promise.resolve(window.SICODApi?.auth?.restoreSession?.());
    } catch {}
  }
}

function ensureSessionSecurityMonitor() {
  if (sessionSecurityMonitorStarted) return;
  sessionSecurityMonitorStarted = true;
  ['pointerdown', 'keydown', 'touchstart', 'mousedown', 'scroll'].forEach((eventName) => {
    window.addEventListener(eventName, markSecurityActivity, { passive: true });
  });
  setInterval(() => {
    runSessionSecurityTick().catch(() => null);
  }, 30000);
}

async function resumeApplicationAfterInactivity(force = false) {
  const now = Date.now();
  if (!force && now - lastAppResumeAt < 15000) return null;
  if (appResumePromise) return appResumePromise;
  lastAppResumeAt = now;
  appResumePromise = (async () => {
    try {
      await withTimeout(
        Promise.resolve(window.SICODApi?.auth?.restoreSession?.()),
        10000,
        "La reprise de session a expiré."
      );
      const authState = window.SICODApi?.system?.getAuthState?.() || {};
      if (authState.authenticated) {
        try {
          await withTimeout(
            hydrateRemoteStateAndReferences(() => window.SICODApi?.system?.hydrateState?.()),
            12000,
            "Le rechargement distant a expiré."
          );
        } catch (error) {
          console.warn('[Resume] Reprise distante incomplète :', error.message || error);
        }
      }
      refreshStorageStatus();
      renderAll();
    } catch (error) {
      console.warn('[Resume] Reprise de session indisponible :', error.message || error);
      refreshAuthGate();
      refreshStorageStatus();
    } finally {
      appResumePromise = null;
    }
  })();
  return appResumePromise;
}

// Initialisation
applyTheme(state.settings.theme);
ensureSessionSecurityMonitor();
window.addEventListener('sicod-write-denied', (event) => {
  showToast(event?.detail?.message || "Votre compte est en lecture seule. Les modifications ne peuvent pas être enregistrées.", 'error');
});
markSecurityActivity();

const dutyMonthEl = document.getElementById('dutyMonth');
if (dutyMonthEl && !dutyMonthEl.value) dutyMonthEl.value = todayISO().slice(0, 7);

initCommandForm();
renderAll();
ensureAuthGateUI();
refreshAuthGate();
window.SICODApi?.auth?.restoreSession?.()
  .then(() => {
    refreshAuthGate();
    return hydrateRemoteStateAndReferences(() => window.SICODApi?.system?.hydrateState?.());
  })
  .then((remoteState) => {
    if (remoteState.kind === 'loaded') {
      renderAll();
    } else if (remoteState.kind === 'empty') {
      refreshStorageStatus();
      persist();
      renderAll();
    } else {
      refreshStorageStatus();
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

// Mise à jour horloge chaque seconde (heure locale)
setInterval(() => {
  const el = document.getElementById('kpiTime');
  if (el) el.textContent = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}, 1000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    appHiddenAt = Date.now();
    return;
  }
  if (!appHiddenAt || Date.now() - appHiddenAt > 60000) {
    resumeApplicationAfterInactivity();
  }
});
window.addEventListener('focus', () => {
  if (!appHiddenAt || Date.now() - appHiddenAt > 60000) {
    resumeApplicationAfterInactivity();
  }
});
window.addEventListener('pageshow', () => {
  resumeApplicationAfterInactivity(true);
});


