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

function isLikelyFilePath(src){
  return /^(file:|[a-zA-Z]:\\|\.\.\/|\.\/|[^:]+\.(png|jpg|jpeg|webp|gif|svg)$)/i.test(String(src || ''));
}

// ============================================================
// SICOD — Script principal consolidé
// Version : refactorée — aucune fonctionnalité supprimée
// Charte graphique : conservée intégralement
//
// ARCHITECTURE :
//   1. Constantes de données (logoBase64, reflexLibrary, commandTypes)
//   2. Couche Storage (isolée — prête pour migration Cloudflare D1)
//   3. État applicatif (state) — unique, initialisé une seule fois
//   4. Utilitaires globaux
//   5. Modules par page (Dashboard, Événements, PS, Command, Fiches,
//      Annuaire, Outils, Planning, Astreintes, Paramètres)
//   6. Bootstrap (init, renderAll, intervalles)
//
// MIGRATION CLOUDFLARE — points documentés :
//   [CF-STORAGE] : remplacer la couche Storage par fetch vers Workers KV / D1
//   [CF-ASSETS]  : remplacer les chemins relatifs assets/ par URLs R2
//   [CF-AUTH]    : implémenter Cloudflare Access dans l'onglet Utilisateurs
// ============================================================

'use strict';

// ────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTES DE DONNÉES
// ────────────────────────────────────────────────────────────────────────────
const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAggAAABaCAIAAABSRznhAAAQKUlEQVR4nO3df0wT5x8H8GsLtPJTQUEnAhZ0cYhV6Bg4cNNhgKkoRnRTmW4zhqngj5kNcUQTWQrEFYmEzUWjzl9zMJGoCFMIgajohqyCX0SLFkUNKoMJFEqBfv+4fO97V6C9QhFK36+/+tw9z3PP84neh95zveNoNBoCAADgf7jDPQAAABhZkBgAAIABiQEAABiQGAAAgAGJAQAAGJAYAACAAYkBAAAYkBgAAIABiQEAABiQGAAAgAGJAQAAGJAYAACAAYkBAAAYkBgAAIABiWHILV++nMPhcLnclJSU4R4LAIB+FsM9gFFu//79OTk5FhYWR44c+eyzz4Z7OAAA+nHwop6hU1paumDBAj6fn52dHRYWNtzDAQBgRU9i4HhlGtSdvCDUoPrjlkQbVJ8gCMf/XDe0CQAAsGf8NQZPQxj96H0Si8WcvtjZ2U2bNu3TTz/Nzc3tnSD7bGVlZeXo6CgWi+Pi4v7++2/2x6I7duzYgOsPrAmlsLAwNjbW19fXxcXFysrK1tbWy8srMjIyMzPz1atXZB0PDw+9/dMVFxdrjar316OysjJ6k/z8/DcfagBgyawXn1tbW+Vy+a+//rps2bIFCxY0NTXpbaJWq5uamsrLyw8ePOjr65uUlPQGxmkUMplMLBaHhIRkZGRUVFS8ePFCrVa3tbXV1taeP39+8+bNrq6uzc3Nwz3M/zPdUAOYOrNODHTFxcXLly83qIlGo0lMTCwpKRmiIRlRbm5uYGBgeXm5jjoqlaqrq+uNDckgJhRqgFHA7BJDaGioRqPRaDStra1XrlwRCoXUruLi4qKiIh2turu7nzx5EhcXR9918uRJvcfSsn79eqPUZ9mkoqJi9erV7e3tZJHD4axfv/7GjRuvX79ubW2trKyUSCSTJk2i6isUCnpXWl+k0tLStI714Ycf9je8AXgzoQYAHcwuMVBsbGxCQkIOHTpE30heLu8Pl8t1dXVNS0tzdXWlNsrl8iEaobFs3bpVqVRSxcOHDx89ejQgIMDOzs7GxmbmzJnx8fG1tbVfffUVh8MZxnHSmWioAUYH800MJB8fH3qRWoDVgcvluru7U0Vra2vjD8t4bt26VVpaShVXrVr1xRdf9K42ZsyYzMxMJyenNzg0/Uwr1ACjhrknhsrKSnpx/Pjxepv09PQoFAqqOHPmTKOPyoguX75ML2pdnBnhTCvUAKOG+SYGpVJZWFgYExND36j7cnlPT099ff327dufPn1KbuHz+Zs2beqvfkFBQe8bKHXkHkPrs2ly584d6jOfz3/33Xd19DZyDHWoAUAHs3skBnkG6XPXvHnzFixYwL7V2LFjs7Ky3NzcjDxEo3r58iX1efz48ZaWlsM4GDZMN9QAo4bZJYb+BAUFnTt3jn39t99+Oz8/38PDY8hGZHwjZ23ZIKYYagCTZr6XkgiCsLa2FgqFK1eu/P3330tKSgxaeq2pqQkODn7w4IGOOn3eQ6ljfdvQ+myaTJgwgfr88uXLofulgkFZx6DKQxFqANDB7BID/QxC/u737Nmz5JOx9bZqamr68ccfqasx9fX1UVFR3d3db2TgAzRr1izqs0qlunXr1hAdiH7LUGdnp9ZelUpFL9ra2vbXj+mGGmDUMLvEMBhjx46NiYmRSCTUFplMdvjw4WEckl7h4eH0YkZGxhAdyMXFhfr85MkTrb2PHz+mF52dnXX3ZoqhBhg1kBgMFhsbS7+5XiKRjNgnSRAE4e/vHxwcTBXPnDnzyy+/9K7W3t6+efPmxsbGAR/ovffeoz7L5fL79+/T9168eJH67Ojo6OXlxaZP0wo1wKiBxGAwKyurHTt2UMW6urozZ84M43j0Sk9Pp1/nWb9+/YYNG27evNnW1qZUKquqqlJSUjw9PTMzMzWDeDlHVFQU/ZaniIiI4uLilpaWR48eJSQkZGVlUbtWr17Nco3B5EINMDogMQzEhg0b6CvVqampfZ5S+7y5nsPhrF271lgjYXOIOXPmnD59WiAQkEWNRnPkyJGAgABbW1sbGxsfH5/4+Pjnz58PciRubm47d+6kijU1NfPnz7e3txcKhRKJhIqPi4tLQkIC+25HTqgBzAcSw0BYW1vHxsZSxaqqqkuXLg3jePRaunRpWVmZr6+vjjp8Pt/CYlC3LyclJW3fvl1HBS8vr4KCAvoD+/QyuVADjAJIDAO0ZcsWGxsbqpicnDyMg2FDJBKVl5dfuXJl8+bNIpFo/PjxFhYW5A27y5Yty8jIqK+vHzt27GAOweVypVJpZWXltm3bxGKxo6OjhYWFjY2Nu7t7ZGTk0aNHKysrRSKRod2aXKgBTJ3xX+1p0HvZ/nlnrkH9E3i1JwDAEMM3BgAAYEBiAAAABiQGAABgQGIAAAAGJAYYhWprazds2BATE/P69evhHguA6UFigNGmtbU1IyMjISEhOjpaKpX29PQM94gATAzexwCjja2tbVpaGkEQQqHw/fffH+7hAJie0Z8YTpw4Qb6Bh8PhjBkzxtnZ2dvb++OPP37rrbd616HbtGnTwoUL1Wp1bm5uSUnJy5cvbWxspk+fvnjx4nfeeUfHgQiCsLKymjhxYnh4eFhYGFWhu7s7Ly+vqKjo2bNnPB7Pw8Nj0aJF9DNXUlJSc3Pz/v376d1u37590qRJ33zzDVnUaDRXr14tKiqqq6vTaDQTJ0708/NbvHgx+du0EydO5OXlaT1QKDU19fnz5+S50igzZRlVNtPpL4D29vZubm5RUVH0x4brnR2bIJNHEYlEe/fupTZKJJK2trakpCTdIeozFP3p6ur6888/CwsLKyoqZsyYQXauNVMejzdhwoSgoKAVK1bw+XyD+gcYOqM/MRAEIRAIyLOJUqmsq6vLzc3dtm3btm3b5s6d27uOloMHD8pksri4OG9vb5VKVVNTc/r06T179vT5jkyqk46OjtLS0szMTEtLy48++oggiO7u7u+///7Ro0cbN26cM2dOV1dXaWlpenq6XC5ft24dy4n09PSkpqbeu3dv3bp1fn5+fD6/pqbm+PHjDQ0NX3/9taHRGMxMCXZRNRTVZ2Nj47Fjx5KSkqRSqaurK8vmLIPM4XBkMlllZaWPj4/uYQzGrVu3SktLw8LCurq6tB4KGx0dHR0dTRCEWq2urq7+4YcfXrx4oftpIgBvknmtMVhbW8+YMSM+Pj4gIODgwYNsViZv3LgREhLi5+cnEAgcHBz8/f2TkpL0vjlZIBAsXLjQ09OzrKyM3HLhwoWKiopdu3YFBgYKBAJbW9vw8PAvv/zy/PnzMpmM5fgvXrz4119/7dmzh3w+HZ/PnzVrVnJysre3N8sedBjYTIkBRVUvJyendevWqdXqiooK9q1YBtnBwWH27NknT54c/Dh1mDt37rfffisWi7ncfv+XWVpazpo1a9GiRdevX8cTxWHkMK/EQFmxYkVHR8e1a9f01nRycqqurm5raxvYgagnjuTn54tEounTp9P3hoSEjBs3Lj8/n2VveXl5vr6+U6dOpW+0tLSkX7AasEHOlDAkquyp1Wr2ldkHee3atffv3x+699kZhMfjDeaB5wBGZ6aJYcqUKXw+X6FQ6K0ZExPz7Nmzzz///Lvvvjt27Njdu3fZ9N/R0VFYWPjw4cP58+cTBNHS0tLQ0ND7KVI8Hs/d3V3324wpZCdaZz0jGthM6dhHVa9//vnn+PHjfD4/MDCQZRODguzp6RkYGHjq1KnhPSN3dXVVV1fn5eUtXbp0kI+2BTAiM/23SC6ZKpVKaktHR0dkZCS9TkZGxuTJk2fPnn3o0KGqqqp79+5VVVXl5uaKxeL4+Hgej9e7W61OwsPDyfMa+Wd4n88uHTdu3L1799iMmeyE/pzRPvWeCEEQHh4eOioMYKZ96h1VQ9HHZm1tvW/fPq1ndOuYnaFBXrNmTVxcXElJyQcffKBjGCQyRFrVrly5kpmZ2ecuNlauXEl+H/L394+KihpADwBDxEwTg0ajUSqV9JOsjvVGPp/v5+fn5+dHEERJSUlaWlp+fv6iRYt616Q6UavVjx49OnDggFQq3blzJ3mg5ubm3k2ampqoYXA4fT/slnzfGVlN76We3hMh79sZzExlMhl1D4+/v/+uXbv6bK4VVd3T6bNPcmw9PT0KhSIlJeXs2bO7d++mv+5Nx+xYBpkyefLk+fPnnzlzJigoSGuXURaf9frtt9/UarVCofjpp592796dmprKPgcDDCkzvZT0+PHjzs5OrYv1bMybN8/BwUHvxR9LS8vp06dHRERcu3atoaHBzs7O2dm5trZWq1p3d3ddXd20adPIokAgaGlp0arz77//ki9fs7Ozc3Fx0XqX8tChz1QkEuX8T39ZgegVVd3T0dEnl8sVCoVbtmwpLy+/fp3tU9ZZBplu1apVjY2Nf/zxB8tDaFm4cGFOTs7Avi6QLC0tp02btnHjxocPH1ZVVQ24HwDjMtPEkJ2dLRAI2NxYqfWXY2dnp1KpHDNmDJujkH8vd3d3EwQRFhYmk8nkcjm9QlFRUVNTU2hoKFkUCoWNjY2NjY1UhYaGhubmZqFQSBbDw8Nv376tdRFfrVazX77WYTAzJWlFVe90dPPx8fH29s7OzmY/ADZBppswYUJoaGhWVpZKpWJ/FKPD/Ugw0phXYmhvb6+urk5JSbl58+bWrVvt7Oz0NsnJydm3b59cLler1U+fPk1LS+vp6SF/mqBDV1fXgwcPLly4MHXqVPIqeUREhEgkkkgkZWVlKpWqtbW1oKDg8OHDERERs2fPJluFhIQ4ODikp6c/fvxYpVIpFIr09HQnJydyBZsgiCVLlvj6+u7du7e4uLilpaWzs/POnTvx8fEDWCg21kyJ/qOqdzp6RUZGKhSK27dvs6zPJshaoqKi2tvb79y5w/IQRiGVSsvLy1+/ft3R0XH37t2ff/55ypQpRrnnGMAozGKNgVxL5HA4AoHA2dl55syZBw4coP9Gl+hrvXHFihVr1qxJTk7Oz8+XSqWvXr2yt7f39PSUSCReXl46DkQQBI/Hc3R09PX1/eSTT8hL5DweLzEx8dKlS2fPnpVKpeSPcrds2RIcHEw1t7Ozk0gkp06dSkxMbG1ttbe3F4lEO3bssLa2Jitwudz4+PirV69evnz50KFDBEG4uLiIxeI+Fzx0R2OQM2UTVb3T0cvPz8/d3f3cuXO631ZNYRNkLQ4ODkuWLMnKyuo9NfoWMkQsh016/vz5pk2bqCLZIblSvXz58uzs7IyMjI6ODicnp4CAANyVBCMKXu0JAAAM5nUpCQAA9EJiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgMP67QXq/dFeHcUY/PAAADI6eF/UAAIC5waUkAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAAYkBgAAYEBiAAAABiQGAABgQGIAAAAGJAYAAGBAYgAAAIb/AoVykzuG5rK2AAAAAElFTkSuQmCC";
const reflexLibrary = {"fiches": [{"code": "2.A", "title": "Feux de forêt", "family": "Risques naturels", "sections": [{"heading": "Synthèse", "items": ["Evénement concerné", "Feu de forêt impliquant la mise en œuvre de moyens de secours importants avec enjeux humains et/ou économiques (infrastructures)."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM", "Evaluation : où - quand - quoi - moyens- enjeux ? cf. verso"]}, {"heading": "Déclenchement", "items": ["Décision du PREFET"]}, {"heading": "Direction des opérations", "items": ["Activation d’une cellule de suivi ou du COD sur décision de l'autorité préfectorale."]}, {"heading": "Premières questions à poser à l’appel du CODIS ou du COSSIM", "items": ["Où et quand, précisément, le FEU DE FORET s’est-il produit ?", "Quelles sont à ce stade, vos difficultés ?", "Qui est le COS ? (commandant des opérations de secours)", "Quelle est l’autorité de police ou de gendarmerie avec laquelle vous êtes en contact ?", "Y-a-t-il des victimes ?", "Si oui, combien et identité des victimes ?", "Ces victimes sont-elles sur le terrain ?", "Un PMA (Poste médical avancé) a-t-il été mis en place ?", "Le procureur a –t-il été averti ?", "Y-a-t-il des habitations menacées ?", "Si oui, - quel est le village menacé et dans quel délai ?", "quelles sont les mesures prises ? qui avez-vous alerté ? (le maire, le député, le CD13, la GGD,...)", "l’évacuation des habitations doit-elle être envisagée ?", "quelles sont les solutions d’hébergement provisoire déjà à l’étude ?", "Quels sont les moyens engagés (terrestres, aériens) ?", "Avez-vous demandé des renforcements au BMPM ou au SDIS ?", "Si oui lesquels ? Les avez-vous obtenus ? dans quels délais ?", "Avez-vous demandé des renforcements extra-départementaux à l’EMIZDS?", "Si oui lesquels ? (colonnes de renfort, moyens aériens BASC)", "Les avez-vous obtenus ? dans quels délais ?", "A ce stade, avez-vous prévenu la presse ?", "Quelle est l’évolution probable de la situation (météorologie, …) ?"]}, {"heading": "Sur le terrain", "items": ["L’autorité préfectorale s’adresse au COS :", "Quelle est la stratégie de lutte contre le feu de forêt mise en œuvre ?", "Comment avez-vous sectorisé votre dispositif ?", "Comment avez-vous organisé votre PC, vos relèves (commandement, groupes d’intervention, …..) ?", "Envisagez-vous un déplacement de votre PC ? si oui, quand ?", "Où sont fixés (sur le terrain et sur la carte) les points de transit pour l’accueil des colonnes de renfort ?", "Quels sont les élus présents sur le terrain ?", "Où les regroupez-vous dans votre PC pour les tenir informés ?", "Un 1er briefing, à leur intention, a-t-il déjà été fait ?", "Quels sont les organes de presse présents ?", "Où est la zone presse ?", "Un point presse a-t-il déjà été fait ? si oui, par qui ?", "- Quelles sont les informations communiquées à ce stade ?"]}, {"heading": "Modalités d’alerte", "items": ["ALERTE DES SERVICES :", "Astreinte SIRACEDPC (mise en place structure suivi d’événement ou gestion de crise)", "CODIS/COSSIM (pour convocation officier de liaison à la Préfecture)", "DDTM (dispositif forestier de surveillance des massifs et coordination routière)", "Services du cabinet du préfet de police délégué", "COG (groupement de gendarmerie 13) / DIPN (CIC : centre d’information et de commandement)", "EMIZDS (information ouverture de la cellule de suivi ou du COD)", "Sous-préfet d’arrondissement (liaison maire(s) concerné(s))", "Communication préfecture", "SINSIC.", "Selon les enjeux :", "Autoroutes :", "Sur tronçon non concédé : CIGT / Services du cabinet du préfet de police délégué (C.R.S /Gendarmerie) / CRICR", "Sur tronçon concédé : Société d’Autoroute (ESCOTA, ASF) / Services du cabinet du préfet de police délégué (C.R.S /Gendarmerie) / CRICR", "Voies ferrées : EIC PACA (GPMM et RDT 13 sont également gestionnaires de réseaux)", "Ligne HT 400 kV et 225 kV :", "Considérer la ligne comme stratégique avec un enjeu supérieur à celui « feu de forêt»", "En liaison avec l’EMIZDS, prendre contact avec RTE pour connaître :", "l’impact de la coupure (nombre d’abonnés, sites particuliers, …)", "le délai nécessaire à la coupure et celui correspondant au rétablissement", "Les départements concernés devront être informés de l’éventualité de la coupure de la ligne HT"]}]}, {"code": "2.B", "title": "Vigilance Météo APIC", "family": "Risques naturels", "sections": [{"heading": "Synthèse", "items": ["Evénement concerné", "Précipitations intenses et très intenses."]}, {"heading": "Alerte initiale", "items": ["Outil d’avertissement complémentaire aux vigilances météorologiques et crues.", "Information des maires abonnées au service et de la préfecture sur les précipitations intenses ou très intenses détectées dans les communes ou à proximité immédiate (bassin Amont)."]}, {"heading": "Déclenchement", "items": ["L’outil APIC :", "Météo-France a développé un service d’« Avertissement Pluies Intenses pour les Communes », informant les maires des précipitations intenses ou très intenses détectées sur leur commune ou à proximité immédiate.", "Service complémentaire de la vigilance météorologique et de la vigilance crue, APIC est un service gratuit d’avertissement aux communes, il suffit de s’abonner sur le site internet https://apic.meteo.fr", "Conditionné à la disponibilité d’informations reçues de radars météorologiques, qualifiant l’intensité des précipitations (2 niveaux), il permet d’anticiper l’inondation par ruissellement ou crue rapide.", "Toutes les communes des Bouches du Rhône y sont éligibles et l’abonnement APIC permet d’accéder aux avertissements de communes voisines (de 1à10) notamment celles situées en amont."]}, {"heading": "APIC et gestion de crise", "items": ["Accessible aux SDIS et aux préfectures, le SIRACEDPC 13 a créé un compte APIC pour recevoir les avertissements concernant le département des Bouches du Rhône et consulter le site."]}, {"heading": "Réception des avertissements", "items": ["L’appel vocal n’a pas été sélectionné, en conséquence, les avertissements sont envoyés par", "SMS / sur les portables d’astreinte SIRACEDPC aux n° : 06.14.88.88.87 et 06.09.73.86.57", "MEL / sur les adresses génériques : pref-siracedpc@bouches-du-rhone.gouv.fr et pccrise-13@bouches-du-rhone.pref.gouv.fr"]}, {"heading": "Consultation du site", "items": ["On accède au site, exclusivement réservé aux mairies, aux préfectures , aux services de prévision des crues et à Météo-France par l’adresse : https://apic.meteo.fr", "A l’ouverture, cliquer sur « se connecter en tant que préfecture »", "Choisir le département BdR dans le menu déroulant le mot de passe est 3jthoi3e / valider", "Accès à la page d’accueil comportant :", "L’affichage des paramètres de l’abonnement et des moyens de réception", "les onglets « cartographie » et « communes abonnées »", "La cartographie, actualisée de ¼ d’heure en ¼ d’heure, indique :", "en violet les communes subissant des précipitations intenses = niveau1", "en fuschia les communes subissant des précipitations très intenses = niveau 2", "Dans le menu communes abonnées, on trouve la liste des abonnements principaux et celle des communes surveillées, au titre de l’abonnement principal.", "Si un avertissement APIC est en cours, la commune est signalée par un téléphone"]}]}, {"code": "2.C", "title": "Vigilance crue", "family": "Risques naturels", "sections": [{"heading": "Événement concerné", "items": ["Crues suite à phénomène météorologique."]}, {"heading": "Alerte initiale", "items": ["Le département des Bouches-du-Rhône comporte 4 cours d’eau majeurs surveillés par 2 SPC (service de prévision des crues).", "Le niveau de vigilance/alerte est diffusé et consultable sur : www.vigicrues.ecologie.gouv.fr"]}, {"heading": "Déclenchement", "items": ["Prévisions de SPC Grand Delta et SPC Méditerranée Est"]}, {"heading": "Modalités d’alerte", "items": ["ETAT DE VIGILANCE VERT", "Pas d’action particulière requise", "ETAT DE VIGILANCE JAUNE", "Risque de crue ou de montée rapide des eaux n'entraînant pas de dommages significatifs, mais pouvant nécessiter une vigilance particulière dans le cas d'activités saisonnières et/ou exposées. Le CODIS et le COSSIM informe les maires et les services.", "Affiner si nécessaire les prévisions avec le SPC concerné ;", "Rester en contact avec le CODIS et le COSSIM.", "ETAT DE VIGILANCE ORANGE", "Risque de crue génératrice de débordements importants susceptibles d’avoir un impact significatif sur la vie collective et la sécurité. Si l’analyse des bulletins d’informations locaux confirme la nécessité d’une action des pouvoirs publics, la préfecture procèdera à l’alerte de l’ensemble des services opérationnels, et des maires si nécessaires : ouverture d’une cellule de suivi en préfecture.", "Affiner les prévisions avec le SPC concerné et Météo-France (CMIR) ;", "Activation si nécessaire par l’astreinte SIRACEDPC d’une cellule de suivi d’événement en préfecture : SIRACEDPC – services de secours – Communication Préfecture ;", "Avertir le service communication de la préfecture qui prend contact avec les médias locaux et prépare éventuellement un communiqué de presse ;", "Informer, le cas échéant, les maires par fax et/ou SMS (Easylink) ;", "Rester en contact avec le CODIS et le COSSIM.", "ETAT DE VIGILANCE ROUGE", "Risque de crue majeure. Menace directe et généralisée de la sécurité des personnes et des biens. Elle justifie la mobilisation immédiate de l'ensemble des acteurs et des moyens au niveau du département.", "Activation du COD par l’astreinte SIRACEDPC et consolidation des prévisions météorologiques et de crues ;", "Avertir le service communication de la préfecture qui prend contact avec les médias locaux et prépare un communiqué de presse ;", "Informer les maires par fax et/ou SMS (Easylink) ;", "Anticiper les demandes de renforts selon besoins auprès de l’EMIZDS."]}]}, {"code": "2.D", "title": "Inondations", "family": "Risques naturels", "sections": [{"heading": "Événement concerné", "items": ["Inondations suite à phénomène météorologique."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM"]}, {"heading": "Déclenchement", "items": ["Décision du préfet."]}, {"heading": "Modalités d’alerte", "items": ["En complément du dispositif de vigilance crues (cf.Vigilance crue), approuvé dans le cadre du règlement de surveillance, de prévision et de transmission de l’information sur les crues (RIC), les objectifs des dispositions spécifiques ORSEC Inondations sont de :", "Définir les missions des différents services appelés à participer à la gestion des inondations et de leurs conséquences ;", "Arrêter un schéma de coordination des services intervenants, notamment au travers de la mise en place d’une cellule de crise.", "Dans le cas où une cellule de suivi d’événement ne soit pas déjà activée en préfecture , auquel cas les services essentiels à la gestion de crise seront déjà alertés :", "Mise en alerte des services (hors services de secours) :", "Astreinte SIRACEDPC pour gréement du COD ;", "Services du cabinet du préfet de police délégué ;", "CORG (groupement de gendarmerie 13) ;", "CIC (Direction départementale de la sécurité publique) ;", "DDTM (police de l’eau et coordination des gestionnaires routiers) ;", "Conseil Général (PC sûreté) ;", "ARS /APHM /SAMU ;", "DREAL ;", "Sous-préfet(s) d’arrondissement(s) concerné(s) ;", "Communication préfecture ;", "SINSIC ;", "COZ (information)."]}]}, {"code": "2.E", "title": "Évacuation des campings en zone de submersion rapide", "family": "Risques naturels", "sections": [{"heading": "Événement concerné", "items": ["Vigilance crues sur cours d'eau, de niveau ORANGE ou ROUGE.", "Épisodes météorologiques : vigilance météo Orage et/ou Pluies-Inondations, de niveau ORANGE ou ROUGE ."]}, {"heading": "Alerte initiale", "items": ["Pour les cours d’eau : messages vigilance crues émanant des SPC Grand Delta et Méditerranée Est ;", "Pour la météo : bulletins de suivi vigilance pour le département 13 ou bulletins spéciaux zone de défense (SPZEF)."]}, {"heading": "Déclenchement", "items": ["Décision du préfet", "en lien avec le(s) maire(s) concerné(s)"]}, {"heading": "Modalités d’alerte", "items": ["Alerte préfecture – mobilisation des astreintes :", "Astreinte SIRACEDPC pour gréement du COD ou de la cellule de suivi ;", "Services du cabinet du préfet de police délégué ;", "Astreinte Communication."]}, {"heading": "2 niveaux :", "items": ["Niveau ORANGE, relayé par le SIRACEDPC avec réunion éventuelle d’une cellule de suivi en préfecture ;", "Niveau ROUGE, relayé par le SIRACEDPC avec réunion systématique d’un COD en préfecture."]}, {"heading": "Structures :", "items": ["Cellule de suivi : PPOL, SDIS, BMPM, DDTM / par liaison téléphonique : Météo-France, SPC Grand Delta et/ou SPC Med-Est ;", "COD : PPOL, DIPN, GGD, CRS, ARS, DREAL, DDTM, CD 13, SDIS, BMPM, DMD, SAMU / par liaison téléphonique : VNF, Météo-France, SPC Grand Delta et/ou SPC Med-Est."]}, {"heading": "Procédure spécifique « Campings »", "items": ["(instruction du gouvernement du 06 octobre 2014 NOR : DEVP149070J)", "En cas de vigilance ORANGE : point téléphonique sur la situation locale avec le(s) maire(s) concerné(s) pour évaluation de la nécessité d’évacuer les campings en zone de submersion rapide.", "Les remontées d’information seront centralisées par la DDTM (RDI) pour proposition éventuelle d’évacuation, en prenant en compte les mesures de précaution qui auraient déjà été prises par un ou plusieurs maire.", "En cas de vigilance ROUGE : le préfet donne les consignes d’évacuation systématique pour tous les campings concernés.", "Diffusion du message ad hoc (cf. modèle en pièce jointe).", "Observation : Lorsqu’il est procédé à l’évacuation d’un ou plusieurs campings, le(s) maire(s) concerné(s) devra (ont) activer leur PCS."]}]}, {"code": "2.F", "title": "Canicule", "family": "Risques naturels", "sections": [{"heading": "Événement concerné", "items": ["Déclenchement d’un niveau d’alerte du plan canicule (4 niveaux )"]}, {"heading": "Alerte initiale", "items": ["Des épisodes aigus de pollution de l’air à l’ozone peuvent survenir à l’occasion de forte canicule."]}, {"heading": "Déclenchement", "items": ["Niveau 1 – Veille saisonnière", "Niveau 2 – Avertissement chaleur", "Niveau 3 – Alerte canicule", "Niveau 4 – Mobilisation maximale"]}, {"heading": "Conditions d’activation", "items": ["Du 1er juin au 15 septembre de chaque année, activation d’une veille saisonnière sur l’évolution climatique et sanitaire ;", "L’ARS PACA prépare et met en œuvre la communication préventive au plan local."]}, {"heading": "Niveau 2 : Avertissement chaleur", "items": ["Phase de veille renforcée", "Une information factuelle des maires par le préfet (SIRACEDPC) sur la base du bulletin spécial de Météo France,", "- des actions de communication préparées par l’ARS et coordonnées avec le service communication de la préfecture de région et de département,"]}, {"heading": "Conditions de déclenchement", "items": ["Le Préfet, au regard de l’expertise de l’ARS, décide du passage du département en niveau 3 « alerte canicule ».", "Le SIRACEDPC envoie l’alerte aux services concernés.", "Une cellule de suivi est activée à la préfecture avec des remontées d’information quotidiennes auprès du COZ."]}, {"heading": "Composition de la cellule de suivie :", "items": ["Préfecture – SIRACEDPC/SRCI", "Services du cabinet du préfet de police délégué", "Agence régionale de santé PACA (coordination de l’organisation sanitaire et médico-sociale conformément aux dispositions du volet ORSAN-CLIM)", "Météo-France", "SDIS 13", "BMPM", "DIRECCTE", "DDDCS", "DDPP", "DDTM", "Conseil départemental", "Métropole Aix Marseille Provence", "Mairie de Marseille", "DASEN (en période scolaire)"]}, {"heading": "Mesures éventuelles :", "items": ["Interdiction de manifestations festives, sportives….", "Actions de communication préventive.", "Le préfet peut mettre en place certaines des mesures départementales."]}, {"heading": "Conditions de déclenchement", "items": ["Le Premier Ministre peut demander au préfet d’activer le niveau de mobilisation maximale.", "Le préfet peut également proposer d’activer le niveau de mobilisation maximale en fonction de l’expertise de l’ARS, des données météorologiques et de la constatation d’effets collatéraux (sécheresse, pannes ou délestages électriques, saturation des hôpitaux, pollution de l’air, …)", "Dès le déclenchement du niveau 4 « mobilisation maximale », le préfet :", "Alerte les services selon les mêmes modalités que pour le niveau 3 « alerte canicule » ;", "Active le COD ;", "Met en œuvre les éléments du dispositif ORSEC pour traiter les différents aspects de la situation.", "Dans ce cadre le COD :", "Se tient informer de la situation sur le terrain ;", "Propose au préfet les mesures nécessaires en vue d’assurer la protection des populations, des biens et de l’environnement ;", "Prépare les éventuelles réquisitions de moyens publics ou privés ;", "Prépare et transmet les éventuelles demandes au COZ en matière de renforts extérieurs ;", "Dirige et coordonne l’action de ces renforts ;", "Rends compte aux échelons supérieurs (COZ et COGIC) ;", "Fourni à la cellule communication les renseignements nécessaires à l’information des médias.", "Point particulier :", "Le COD peut solliciter auprès des maires la communication des registres nominatifs qu’ils ont constitués pour le recensement des personnes âgées et des personnes en situation de handicap qui en ont fait la demande."]}]}, {"code": "2.G", "title": "Séisme et effondrements de bâtiments", "family": "Risques naturels", "sections": [{"heading": "Événement concerné", "items": ["S’applique :", "À tout événement sismique susceptible d’occasionner des dommages significatifs aux personnes, aux infrastructures ou aux réseaux essentiels ;", "En cas d’effondrements multiples de bâtiments, quelle qu’en soit la cause, dès lors que l’ampleur des dommages est étendue sur plusieurs communes ou que le nombre potentiel de victimes dépasse les capacités de réponse courante communale."]}, {"heading": "Alerte initiale", "items": ["Alerte sismique via bulletin du CEA ou COGIS OU Information / Perception du territoire (CF Fiche B1.1)"]}, {"heading": "Déclenchement", "items": ["Décision du préfet.", "(Pour une simple secousse, DOS MAIRE avec communication centralisée par SRCI)"]}, {"heading": "Scenarii de réfénrece", "items": ["4 scenarii de référence (Cf stratégie de réponse – Fiche B4) :", "Scenario MINEUR (simple secousse) – Cf Fiche 5.1", "Scenario MOYEN (séisme avec dégâts léger sans rupture de flux) - Cf Fiche 5.2", "Scenario MAJEUR (séisme majeur avec rupture de flux) - Cf Fiche 5.3", "Effondrements multiples de bâtiments (Ex : Tempête ALEX - Alpes Maritimes) – Cf Fiche 5.4"]}, {"heading": "Modalités d’alerte", "items": ["Cf Fiche B1.1 et D1 – Messages FR-ALERT", "Actions réflexes", "Prise en compte de la vraisemblance d’un séisme :", "Observer l’activité sismique relevée à partir du site Internet https://sismoazur.oca.eu/#/", "Observer et suivre les relevés d’intensité à partir du site Internet https://www.franceseisme.fr/", "Informer la chaîne ORSEC via GEDICOM (Cf. Fiche B1.2)", "Solliciter des expertises (Cf. Fiche B3) :", "Du BRGM (Permanence téléphonique 24 / 24 – 02 38 64 34 34)", "Forces d’expertise via le COZ :", "du Groupe d’intervention macrosismique (GIM) ;", "de l’Association française du génie parasismique (AFPS) ;", "du Service de traitement d’image et de télédétection (SERTIT).", "Mise en œuvre préventive des moyens permettant la continuité des transmissions à savoir les moyens satellitaires et le réseau radio ADRASEC (Cf. Fiche C7 – D3).", "Risques technologiques"]}]}, {"code": "3.A", "title": "NOVI (« nombreuses victimes »)", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Nombreuses victimes impliquant l’intervention d’importants moyens médicaux (incendie, accident de transport, attentat, effondrement d’immeuble...)"]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM à l’autorité préfectorale – CORG – CIC – SAMU", "Évaluation : où - quand - quoi - moyens- enjeux ?"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale sur proposition du CODIS ou COSSIM", "Dans le cadre d’évènements à vocation purement sanitaire (hors secours à personne), l’ARS et/ou le SAMU propose(nt) au Préfet ou son représentant de mobiliser les acteurs et/ou services concernés (notamment les établissements de santé et médicosociaux, les professionnels de santé, les acteurs extra sanitaires)."]}, {"heading": "Modalités d’alerte", "items": ["Cas général de mise en alerte des services (hors services de secours/ CORG/CIC et SAMU) :", "Astreinte SIRACEDPC pour gréement du COD", "Services du cabinet du préfet de police délégué", "DDTM (coordination des gestionnaires routiers)", "Conseil Départemental (PC sûreté)", "ARS /APHM", "DREAL", "Sous-préfet(s) d’arrondissement(s) concerné(s)", "Communication préfecture", "SINSIC", "COZ (information)"]}, {"heading": "Direction des opérations", "items": ["Le préfet, DOS (Directeur des Opérations de secours), décide la mise en œuvre du plan.", "Active le COD comme base arrière des opérations de secours : PP13, SIRACEDPC, SINSIC, Communication Préfecture, représentants des services concernés (dont DDTM et ARS).", "Habituellement dirigé par le directeur de cabinet, le SIRACEDPC en assure le fonctionnement.", "Désigne un membre du corps préfectoral auprès du COS chargé de diriger le PCO (ou PC interservices auprès du PC de site)", "Décide de l’activation de la CUMP selon l’évaluation faite par APHM et SAMU", "Autorise la levée du plan quand l’opération est terminée, en maintenant un dispositif allégé dans l’attente d’un bilan définitif qui sera diffusé à la presse.", "Le SDIS ou le BMPM désigne le Commandant des Opérations de Secours (COS)", "LE COS :", "diffuse l’arrêté de déclenchement à : SAMU, CORG, CIC (DIPN), DDTM, maire(s), sous-préfet d’arrondissement, autorité judiciaire ;", "mobilise les moyens de secours et de sécurité", "active le PCS (poste de commandement de site inter services) implanté sur le terrain, armé par moyens mobiles SDIS/BMP. Il est dirigé par un membre du corps préfectoral, habituellement le sous-préfet d’arrondissement. Si nécessaire le volet interservices peut être regroupé au sein d’un PCO distinct sous l’autorité du sous-préfet désigné (en règle générale, le sous-préfet d’arrondissement).", "est assisté par :", "Le DSI : Directeur Sauvetage Incendie, chargé des opérations non médicales ;", "Le DSM : Directeur des Secours Médicaux, qui peut être :", "le médecin chef du SDIS, sur le département hors Marseille ;", "le médecin chef du BMP sur la ville de Marseille ;", "le médecin chef du SAMU sur l’aéroport Marseille Provence.", "un PMA « poste médical avancé » qui regroupe, trie, évacue les victimes ;", "le SAMU qui apporte son concours, assure répartition et accueil en hôpitaux ;", "la CUMP : cellule d’urgence médico psychologique organisée par l’APHM et activée selon l’évaluation faite par le SAMU"]}]}, {"code": "3.B", "title": "Novis sinus", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Nombreuses victimes impliquant l’intervention d’importants moyens médicaux (incendie, accident de transport, attentat, effondrement d’immeuble...)", "Information outil", "Le portail SINUS est l’outil national unique par lequel les autorités accèdent à la totalité du dénombrement des victimes.", "Il permet de fournir le plus d’informations possibles sur les victimes afin de faciliter leur identification par l’autorité judiciaire et les services d’enquête compétents, leur prise en charge médicale par les établissements de santé (ES) et l’information des familles et des proches, assurée par la CIAV.", "Procédure", "Ainsi, lors d’un événement générant de nombreuses victimes (accident, attentat..), SINUS va permettre à tous les services de partager les informations relatives aux victimes :", "Les primo-intervenants (pompiers, policiers), vont doter les victimes d’un bracelet SINUS ;", "Au PMA : les victimes seront catégorisées (UA, UR) et orientées vers une structure d’accueil.", "A chaque étape de la chaîne des secours, de nouvelles informations viendront enrichir la base SINUS (pour les personnes ne passant pas par le PMA, ce sont les centres hospitaliers qui les doteront d’un bracelet d’identification).", "Au final, les listes pourront être éditées en COD à destination des autorités :", "par catégorisation : UA, UR, DCD ;", "par identité ;", "par destination hospitalière.", "ATTENTION : pour les personnes décédées, l’autorité judiciaire peut bloquer la liste nominative.", "Adresses SINUS :", "https://sinus.novi.interieur.gouv.fr (pour les cas réels)", "https://formation.sinus.novi.interieur.gouv.fr (pour s’entraîner, pour les exercices).", "Connexion :", "EN COD, SINUS NE PERMET QUE LA CONSULTATION OU L’EDITION DE LISTES"]}]}, {"code": "3.C", "title": "Plan particulier d’intervention", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Accident industriel concernant un établissement SEVESO II - seuil haut – (donc doté d’un plan particulier d’intervention)"]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM à l’autorité préfectorale – CORG – CIC – SAMU", "Évaluation : où - quand - quoi - moyens- enjeux ?"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale"]}, {"heading": "Modalités d’alerte", "items": ["CODIS / COSSIM assurent la transmission de l’alerte aux mairies, organismes et services figurant dans le schéma d’alerte du PPI concerné.", "En cas d’extrême urgence, l’exploitant est compétent pour demander directement auprès des services concernés la mise en œuvre de contre-mesures immédiates (interruption trafic routier, ferroviaire, …)", "Astreinte SIRACEDPC pour gréement du COD", "Services du cabinet du préfet de police délégué", "DDTM (coordination des gestionnaires routiers)", "Conseil Départemental (PC sûreté)", "ARS /APHM", "DREAL", "Sous-préfet(s) d’arrondissement(s) concerné(s)", "Communication préfecture", "SINSIC", "COZ (information)", "Organisation de commandement", "Le préfet, DOS (Directeur des Opérations de secours) :", "Active le COD (SIRACEDPC)", "Désigne le sous-préfet qui dirige le PCO (mis en place par le commandant des opérations de secours)", "Fait préparer un premier communiqué de presse", "Fait rédiger le message de mise en œuvre du PPI et le fait diffuser par le CODIS / COSSIM", "Déclenche les contre-mesures externes immédiates (si celles-ci n’ont pas été activées ou demandées en mode réflexe par l’exploitant) :", "Alerte des populations par : (au signal d’alerte : mise à l’abri, écoute de la radio)", "sirène PPI (exploitant)", "sirène SAIP (COZ)", "ensemble Mobiles d’alerte (mairie/BMPM/SDIS)", "Interruption des circulations de transit : Routière / Ferroviaire / Aérienne (mesure prise par DSAC)", "Fait diffuser par les radios des messages établis par le service Communication", "Si nécessaire, met en œuvre des mesures de sauvegarde complémentaires :", "Évacuation partielle, totale, ou confinement général ;", "Bouclage et surveillance de la zone ;", "Installation de postes médicaux avancés (PMA) ;", "Déclenchement éventuel du NOVI ;", "Ouverture de Centres Médicaux d’Evacuation ;", "Cellule d’Urgence médico-psychologique ;", "Centre d’Accueil et de REgroupement (CARE) des communes dans le cadre de leurs PCS.", "Procède régulièrement à :", "points de situation avec PCO et Exploitant ;", "points presse et communiqués ;", "compte-rendus aux autorités centrales via le COZ ;", "tenue de tableaux des moyens mis en œuvre et demandes de renforts ;", "contacts avec les élus ;", "bilans précis des victimes.", "Active, si nécessaire, une cellule de réponse aux appels du public", "Autorise la levée du dispositif", "CIPChef d'Incident PrincipalInterlocuteur unique du DOSInterface avec les services de l'EIC PACAet de l'EF SNCFCILChef d'Incident LocalInterlocuteur unique du COSAssure la protection despersonnels présents surle siteInterface avec leCOGCCOGCCentre régionalInterlocuteur du CODISAssure la gestion de l'incidentAssure la diffusion de l'informationSupplée le CIL en son absenceDOSDirige les opérations de secoursCOSMets en œuvre les opérations de secoursCODIS / COSSIMMise en œuvre de l'alerteAssure l'interface entre COS etCOGC en l'absence du CIL EIC PACAPREFECTUREServices de secours", "CIP", "Chef d'Incident Principal", "Interlocuteur unique", "du DOS", "Interface avec les", "services de l'EIC PACA", "et de l'EF SNCF", "CIL", "Chef d'Incident Local", "Interlocuteur unique", "du COS", "Assure la protection des", "personnels présents sur", "le site", "Interface avec le", "COGC", "COGC", "Centre régional", "Interlocuteur", "du CODIS", "Assure la gestion de", "l'incident", "Assure la diffusion de", "l'information", "Supplée le CIL en", "son absence", "DOS", "Dirige les opérations de secours", "COS", "Mets en œuvre", "les opérations de secours", "CODIS / COSSIM", "Mise en œuvre de l'alerte", "Assure l'interface entre COS et", "COGC en l'absence du CIL", "EIC PACA", "PREFECTURE", "Services de secours"]}]}, {"code": "3.D", "title": "Réseaux ferroviaires", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Accident grave de chemin de fer impliquant l’intervention de moyens complémentaires à ceux du plan d’intervention et de sécurité (PIS) de l’EIC PACA.", "Déclenchement possible simultané des dispositions ORSEC NOVI et TMD."]}, {"heading": "Alerte initiale", "items": ["par EXPLOITANT à l’autorité préfectorale – CORG – CIC – SAMU", "Évaluation : où - quand - quoi - moyens- enjeux ?"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale sur proposition de l’exploitant", "Zones de compétences", "SDIS :", "aux têtes nord des tunnels de la Nerthe et de Marseille ;", "aux têtes nord et sud des tunnels du Mussuguet et des Janots.", "BMPM :", "aux têtes sud des tunnels de la Nerthe et de Marseille."]}, {"heading": "Modalités d’alerte", "items": ["En cas d’évènements graves ou présentant d'emblée un caractère spécifique susceptible d'entraîner une dégradation de la situation des passagers et/ou des riverains tels que :", "arrêt prolongé d'un train de voyageurs dans un tunnel ;", "accident de personnes ;", "feu sur rame ;", "accident impliquant de nombreuses victimes ;", "fuite d'une substance chimique ou radioactive ;", "Le gestionnaire ferroviaire concerné, active son PIS ou sa procédure d'urgence. Il alerte immédiatement et systématiquement les services publics pour permettre la montée en puissance rapide des moyens de secours. Si un évènement est signalé directement aux services d'incendie et de secours, ces derniers transmettent immédiatement l'information au gestionnaire ferroviaire compétent : CRC du COGC (EIC PACA).", "NB : Le Grand Port Maritime de Marseille et la RDT 13 sont également gestionnaires de réseaux ferroviaires."]}]}, {"code": "3.E", "title": "Aéroport Marseille-Provence", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Accident ou risque d’accident d’un aéronef intervenant", "en ZA (zone d’aérodrome = dans l’emprise de l’aéroport Marseille-Provence)", "en ZVA (zone voisine d’aérodrome = limitée dans le PSS)"]}, {"heading": "Alerte initiale", "items": ["par Tour de contrôle aéroport Marseille-Provence"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale à la demande du directeur de l’aéroport", "Phases", "VEILLE :Il y a état de veille si un pilote signale, ou si l’on soupçonne des défaillances à bord, mais non des défaillances de nature à entraîner normalement des difficultés graves à l’atterrissage (mouvements d’aéronef en essais ou au stade d’expérimentation, vibration moteur, mauvaises conditions de visibilité météorologique.....).", "ALERTE : Il y a état d’alerte si l’on signale ou l’on soupçonne qu’un aéronef a subi, ou risque de subir une défaillance de nature à entraîner un risque d’accident (voyant incendie allumé, fuite d’huile, baisse de pression hydraulique des freins, fumée ou odeur anormale à l’ intérieur de l’aéronef, train d’atterrissage, alerte à la bombe, mauvaises conditions météorologiques...).", "ACCIDENT : Il y a  état d’accident lorsqu’un événement mettant en cause la sécurité de l’aéronef ou de ses passagers (chute, incendie en vol ou au roulage, etc.) vient de se produire ou va inévitablement se produire.", "À la demande du Directeur de l’exploitant de l’aérodrome (CCIMP) ou de son représentant, le Préfet met en œuvre les dispositions spécifiques de l’Aéroport Marseille-Provence."]}, {"heading": "Modalités d’alerte", "items": ["Ouverture d’une cellule de crise (PCO) dès la phase d’alerte, avec les services suivants :", "SIRACEDPC", "Services du cabinet du préfet de police délégué", "DDTM (coordination des gestionnaires routiers)", "Communication préfecture", "SINSIC", "SDIS/BMPM", "GGD", "Compagnie aérienne exploitante ou assistante", "DSAC", "Dès réception du message d’alerte et/ou du message d’accident, le PCO est ouvert et armé par l’exploitant d’aérodrome. Ce dernier installe et s’assure du bon fonctionnement des moyens de communication et de logistique.", "Un PCO (PC directeur) est ouvert et armé par la SPAF avec l’aide de la CCIMP", "Un COD (base arrière) est ouvert en préfecture."]}, {"heading": "Direction des opérations", "items": ["-en ZA et ZVA : la Direction des Opérations de Secours (D.O.S.) est assurée par l’autorité préfectorale. Le DOS (Sous-Préfet d’Istres ou Directeur de Cabinet) est installé dans le PC Opérationnel.", "en ZVA maritime : la responsabilité de la direction des opérations de secours incombe au Préfet des Bouches-du-Rhône."]}]}, {"code": "3.F", "title": "BA 125 (Istres)", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Accident d’un aéronef intervenant en :", "ZA (zone d’aérodrome)", "ZVA (zone voisine d’aérodrome )"]}, {"heading": "Alerte initiale", "items": ["par BA 125"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale sur proposition du commandant de la BA 125 ou du CODIS"]}, {"heading": "Modalités d’alerte", "items": ["Bilan :", "Type d’appareil", "Heure de l’accident", "Coordonnées de l’accident", "Nombre de passagers ou capacité maximale d’aéronef", "Incendie observé ou non (ampleur des dégâts)", "Dangers représentés par l’épave (matières dangereuses, munitions…)", "Etc…", "Services présents au COD :", "Sous-préfet d’Istres ou autre sous-préfet désigné", "SDIS", "SAMU / APHM / ARS", "DIPN", "Gendarmerie", "Mairies d’Istres, Fos-sur-Mer, Saint Martin de Crau", "Conseil Général", "SINSIC", "Communication préfecture"]}, {"heading": "Direction des opérations", "items": ["Le Préfet est le DOS, Directeur des Opérations de Secours.", "Le Directeur départemental du SDIS est le COS, Commandant des Opérations de Secours.", "Le COS détermine l’emplacement du Poste de Commandement Avancé/Poste de Commandement de Site (PCA/PCS) et mobilise les moyens de secours et de sécurité.", "Un COD est activé à la préfecture des Bouches-du-Rhône.", "ACTION PREFECTORALE", "faire diffuser l’alerte des services par le CODIS conformément au schéma général d’alerte,", "prendre l’arrêté de déclenchement des dispositions spécifiques ORSEC BA 125 et le faire diffuser par le CODIS 13 conformément au schéma général d’alerte,", "désigner un membre du corps préfectoral auprès du COS,", "faire préparer dès que possible par le service communication de la préfecture, le message d’alerte aux radios et le premier communiqué de presse,", "informer l’échelon national via le COZ sud,", "faire préparer l’arrêté de levée du plan lorsque la situation le permet."]}]}, {"code": "3.G", "title": "Sauvetage aéro-terrestre (Sater)", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Les dispositions spécifiques Orsec pour sauvetage aéro-terresre (Sater) ont pour objet la recherche terrestre et la localisation précise d'un aéronef en détresse et de leurs occupants.", "La localisation de l’épave provoque l’arrêt des recherches et l’engagement effectif de la phase de secours aux victimes.", "Celle-ci peut nécessiter l’activation des dispositions Orsec NOVI.", "Organisation", "L’organisation « Sater » est déclinée en phases opérationnelles.", "En coordination avec l’ARCC, correspondant aéronautique compétent au titre des recherches aériennes, le préfet de département est le directeur des opérations de recherches terrestres (DOR) dans les phases BRAVO à CHARLIE. Le commandant de la gendarmerie départementale ou le directeur départemental de la sécurité publique est le commandant des opérations de recherches terrestre (COR) dans les phases BRAVO à CHARLIE", "L’ARCC de Lyon informe la préfecture de sa décision d’engager l’ADRASEC par téléphone et par fax de confirmation.", "Prendre contact avec :", "CODIS / COSSIM (prévenu par le COZ sud)", "CORG / CIC", "ADRASEC", "ARCC (pour le tenir informé)"]}]}, {"code": "3.H", "title": "Pollution marine (POLMAR/Terre)", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Les dispositions spécifiques « POLMAR/Terre » du plan ORSEC des Bouches-du-Rhône ont pour objet de faire face à une pollution marine de grande ampleur, par hydrocarbures ou tout autre produit (notamment chimique), résultant d'un accident ou d'une avarie maritime, terrestre ou aérienne."]}, {"heading": "Alerte initiale", "items": ["par CROSSMED, CODIS, COSSIM, GIE, plaisanciers…."]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale"]}, {"heading": "Modalités d’alerte", "items": ["Recouper l’information et obtenir tous renseignements utiles en liaison avec :", "PREMAR ;", "CROSSMED pour apprécier les capacités des moyens de lutte en mer à résorber la pollution et épargner les côtes et anticiper la mise en œuvre éventuelle du dispositif de lutte à terre ;", "Météo-France ;", "CEDRE ;", "CODIS/COSSIM ;", "COZ SUD.", "Anticiper la mise en oeuvre éventuelle du dispositif de lutte à terre par l’alerte/mobilisation :", "du sous-préfet d’arrondissement potentiellement concerné ;", "du/des maire(s), de la /des intercommunalités potentiellement concerné(s) ;", "du conseil général ;", "de la DDTM, de la DREAL, du GPMM et de l’IFREMER.", "Si la situation menace d’évoluer vers une pollution de grande ampleur, le Préfet décide la mise en œuvre, des dispositions spécifiques POLMAR/Terre :", "le DDSIS ou le commandant du BMPM est le COS selon le secteur territorial principalement concerné. Le Préfet lui fait préparer la montée en puissance du schéma de conduite des opérations de lutte ;", "le Préfet donne l’ordre au CODIS (ou au COSSIM) de déclencher l’alerte en vue de l’activation du COD ;", "il fait activer, par le COS, le ou les PCOpérationnel(s) et PCAvancés nécessaires (jusqu’à 4 PCO et 11 PCA prédéterminés) et les chantiers ;", "il convoque au COD les experts (CEDRE, IFREMER.…) ;", "il informe le COZ chargé de l’information des départements littoraux limitrophes (Gard, Var) ;", "il fait procéder à l’échange « d’officiers de liaison » avec PREMAR, et à l’activation d’une cellule communication/presse conjointe si possible."]}, {"heading": "Direction des opérations", "items": ["En mer : Si la menace de pollution ou la pollution en mer présente un degré élevé de gravité ou de complexité, notamment s'il n'est pas possible d'y faire face avec les seuls moyens ordinaires des administrations, le préfet maritime met en oeuvre le plan ORSEC Maritime, dispositions spécifiques « POLMAR ».", "Le préfet maritime est alors chargé de la direction des opérations de lutte en mer sous l'autorité directe du Premier ministre.", "A terre : Si la menace de pollution ou la pollution s'exerce sur le littoral et présente un degré élevé de gravité ou de complexité, notamment s'il n'est pas possible d'y faire face avec les", "seuls moyens ordinaires des collectivités locales et de l'État, le préfet de département met en oeuvre les dispositions spécifiques « POLMAR/Terre ».", "Le préfet de département est alors chargé de la direction des opérations de lutte à terre sous l'autorité du ministre de l'Intérieur.", "(pollutions de petite et moyenne ampleur = « infra polmar » = compétence du maire)", "Face aux pollutions de faible et moyenne ampleur ; les opérations de lutte incombent aux communes et sont dirigées par les Maires qui en supportent le coût financier.", "Si nécessaire, une cellule d’appui aux collectivités peut être réunie autour de l’autorité préfectorale. Elle est composée de la préfecture, de la DDTM, de l’ARS, du SDIS, du BMPM, de la DIRM, de la DREAL, de la DRFiP, de la gendarmerie et/ou de la DIPN, de la DDPP. Orsec POLMAR Terre n’est pas mis en œuvre ."]}]}, {"code": "3.I", "title": "Barrage de Bimont", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Risque de rupture ou rupture du barrage de Bimont.", "Inondation de la vallée de l’Arc, soit 8 communes impactées :", "Zone de proximité immédiate : Le Tholonet, Aix-en-Provence, Meyreuil", "Zone d’inondation spécifique : Ventabren, Velaux, Coudoux, La Fare-les-Oliviers, Berre-l’Etang"]}, {"heading": "Alerte initiale", "items": ["Alerte initiale : Société du canal de Provence vers Préfet, DREAL", "En cas d’extrême urgence, l’exploitant est compétent pour demander directement auprès des services concernés la mise en œuvre de contre-mesures immédiates (interruption trafic routier, ferroviaire, …)", "CIC", "CODIS", "sous-préfet de permanence", "préfet de police", "Maire des communes concernées", "DREAL"]}, {"heading": "Modalités d’alerte", "items": ["Cf. ci-après"]}]}, {"code": "3.J", "title": "Spéléo-secours", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Accident de spéléologie."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM (sur appel d’un particulier)"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale sur proposition du CODIS ou COSSIM"]}, {"heading": "Modalités d’alerte", "items": ["ALERTE DES SERVICES :", "Astreintes SIRACEDPC et Cabinet Préfet de Police", "Fédération Française de Spéléo : Conseiller Technique Départemental (CTD)", "COG (groupement de gendarmerie 13)", "DIPN (CIC : centre d’information et de commandement)", "CODIS/COSSIM", "SAMU /APHM /ARS", "Mairie concernée", "Sous-préfet d’arrondissement concerné", "CMIR sud-est", "Communication préfecture", "COZ sud"]}, {"heading": "Direction des opérations", "items": ["Le préfet, DOS (Directeur des Opérations de secours),", "Désigne le COS : Directeur du SDIS ou Commandant du BMPM (selon zone accident).", "Le COS :", "détermine l’emplacement du PCO (avec la participation du CTD, police, gendarmerie) ;", "demande au maire de prendre immédiatement, sous sa responsabilité, toutes les dispositions nécessaires à l’installation du PCO, au ravitaillement et à l’hébergement ;", "est chargé de la coordination des opérations en surface, et tient le directeur des secours et le maire informés en permanence ;", "fait acheminer moyens et personnels nécessaires au déroulement de l’opération.", "Active le COD ou un PCO au plus près de l’évènement :", "Cabinet Préfet de Police, SIRACEDPC, SINSIC, Communication, représentants des services concernés.", "Si les circonstances le justifient, le préfet peut décider de faire activer en préfecture une cellule légère de suivi, qui monterait en puissance (COD) si les opérations devaient se prolonger."]}]}, {"code": "3.K", "title": "Déminage", "family": "Risques technologiques", "sections": [{"heading": "Événement concerné", "items": ["Interventions sur munitions de guerre", "Interventions sur engins explosifs improvisés (EEI) ou alerte à la bombe", "Sécurisation de voyages officiels (VO) de personnalités ou de manifestations socio-culturelles", "Réquisition de terrains privés aux fins de destruction d’urgence des matières activés ou des munitions collectées."]}, {"heading": "Alerte initiale", "items": ["par CODIS ou COSSIM (sur appel d’un particulier)"]}, {"heading": "Déclenchement", "items": ["Décision de l’autorité préfectorale sur proposition du CODIS ou COSSIM"]}, {"heading": "Modalités d’alerte", "items": ["Cette fiche réflexe comprend les actions à conduire en heures ouvrables (J.H.O) et en heures non ouvrables (J.H.N.O).", "Interventions sur munitions de guerre", "J.H.O :", "Le SIRACEDPC peut être avisé d’une demande d’intervention : particuliers / maires / forces de l'ordre / services de secours.", "se fait adresser un mail de confirmation comportant tous les renseignements utiles pour l’intervention des démineurs, à l'adresse pref-deminage@bouches-du-rhone.gouv.fr", "rappelle les mesures conservatoires à prendre sur les lieux : balisage/interdiction d’accès.", "saisie du centre de déminage de Marseille par mail (cd-marseille@interieur.gouv.fr).", "Si urgence, doubler d’un appel téléphonique sur le portable du chef de centre : 06 26 78 00 49 ou 06 26 78 00 35 ou 06 26 78 00 36.", "J.H.N.O :", "le COGIC (centre opérationnel de gestion interministérielle des crises) est avisé par les forces de l'ordre ou les services de secours ; il saisit le centre de déminage (les munitions de guerre ne justifient en principe pas une intervention immédiate).", "Sur le littoral :", "pour engin immergé ou marqueurs marines, alerter le centre des opérations maritimes (PREMAR), bureau des opérations côtières (cf. annuaire ORSEC).", "Interventions sur EEI ou alerte à la bombe", "J.H.O :", "contacter le cabinet du Préfet de police (secrétariat : 04 96 10 64 31)", "J.H.N.O :", "contacter l’astreinte Cabinet du Préfet de police", "Missions de sécurité sur VO et manifestations", "En principe, ces missions sont programmées : la demande d’intervention est donc exceptionnelle.", "En J.H.N.O : Saisir le COGIC.", "Réquisition de terrains privés aux fins de destruction d’urgence", "J.H.O et J.H.N.O :", "Expertise du démineur chef de la mission relative à la nécessité de détruire au plus près du lieu de découverte de matières actives ou de munitions", "Information du SIRACEDPC / du sous-préfet de permanence ainsi que des services de police ou gendarmerie territorialement compétents par le démineur chef de la mission en cas de refus de mise à disposition d'un terrain privé", "Prise de contact avec le propriétaire du terrain par les services de police ou gendarmerie territorialement compétents. En l'absence d'accord à l'amiable, il est rendu compte sans délai au SIRACEDPC / au sous-préfet de permanence du refus et des motifs invoqués.", "Rédaction par le SIRACEDPC / le cadre d'astreinte du SIRACEDPC de l'arrêté de réquisition et transmission aux services chargés de son exécution (Police Nationale = via la C.I.C. / Gendarmerie Nationale = via le CORG)", "Notification au propriétaire par les services de police ou gendarmerie territorialement compétent et information du maire de la commune concernée"]}, {"heading": "Direction des opérations", "items": ["Risques sanitaire", "Risques divers"]}]}, {"code": "5.A", "title": "Electro-secours", "family": "Risques divers", "sections": [{"heading": "Événement concerné", "items": ["Risque de rupture d'approvisionnement en électricité ou rupture de cet approvisionnement à raison d'un aléa climatique, d'une défaillance technique ou d'un acte de malveillance."]}, {"heading": "Alerte initiales", "items": ["par CODIS, COSSIM"]}, {"heading": "Déclenchement", "items": ["Décision du PREFET"]}, {"heading": "Direction des opérations", "items": ["Les réseaux de transport et de distribution ont pour fonction d’acheminer l’électricité en assurant l’équilibre entre l’offre et la demande. Cette adéquation garantit l’approvisionnement des", "clients dans des conditions optimales de sûreté, de fiabilité et de compétitivité. Deux filiales d’EDF se partagent la tâche :", "- RTE (Réseau de Transport d’Électricité) transporte l’électricité haute et très haute tension,", "- ENEDIS gère le réseau de distribution qui achemine l’électricité vendue par les fournisseurs d’énergie, quels qu’ils soient aux utilisateurs (particuliers, entreprises, collectivités).", "Enedis a :", "- la charge des travaux de rétablissement du réseau avec les moyens du plan ADEL et la facilitation des pouvoirs publics ;", "- la responsabilité technique des raccordements des alimentations de secours pour les usagers sensibles raccordés au réseau de distribution basse tension."]}, {"heading": "Modalités d’alerte", "items": ["Prévenir le sous-préfet de permanence. Si plan déclenché, aller au point 2.", "Alerte des services :", "BMPM", "DREAL", "ARS", "SAMU", "APHM", "DDTM", "Sous-préfet d’arrondissement concerné", "Communication préfecture", "SINSIC", "Personnel SIRACEDPC", "En temps que de besoin : ERDF, RTE, DDPP, DDCS, METEO, MAMP, CD13, PP13, SNCF, DSDEN etc.."]}]}], "glossary": ["ADRASEC : Association départementale des radioamateurs au service de la sécurité civile", "AFPS : Association française du génie parasismique", "APHM : Assistance publique – Hôpitaux de Marseille", "APIC : Avertissement Pluies Intenses à la Commune (service Météo-France)", "ARCC : Centre de coordination et de contrôle des routes aériennes (Air Route Control Center)", "ARS : Agence régionale de santé", "ASF : Autoroutes du Sud de la France", "BA 125 : Base aérienne 125 d'Istres", "BASC : Base aérienne de sécurité civile", "BMPM : Bataillon de marins-pompiers de Marseille", "BRGM : Bureau de recherches géologiques et minières", "CCIMP : Chambre de commerce et d'industrie métropolitaine Provence", "CEA : Commissariat à l'énergie atomique et aux énergies alternatives", "CEDRE : Centre de documentation, de recherche et d'expérimentations sur les pollutions accidentelles des eaux", "CIAV : Cellule interministérielle d'aide aux victimes", "CIC : Centre d'information et de commandement (Direction départementale de la sécurité publique)", "CIGT : Centre d'ingénierie et de gestion du trafic", "CMIR : Centre météorologique interrégional (Météo-France)", "COD : Centre opérationnel départemental", "CODIS : Centre opérationnel départemental d'incendie et de secours", "COG : Centre opérationnel de la gendarmerie", "COGIC : Centre opérationnel de gestion interministérielle des crises", "COGIS : Centre opérationnel de gestion et d'information sismique (CEA)", "CORG : Centre opérationnel de la gendarmerie (régional)", "COS : Commandant des opérations de secours", "COSSIM : Centre opérationnel des services de secours et d''incendie de Marseille", "COZ : Centre opérationnel de zone", "CRICR : Centre régional d'information et de coordination routières", "CROSSMED : Centre régional opérationnel de surveillance et de sauvetage Méditerranée", "CRS : Compagnie républicaine de sécurité", "CUMP : Cellule d'urgence médico-psychologique", "DASEN : Directeur académique des services de l'éducation nationale", "DDDCS : Direction départementale déléguée à la cohésion sociale", "DDPP : Direction départementale de la protection des populations", "DDTM : Direction départementale des territoires et de la mer", "DIPN : Direction interdépartementale de la police nationale", "DIRECCTE : Direction régionale des entreprises, de la concurrence, de la consommation, du travail et de l'emploi", "DIRM : Direction interrégionale de la mer", "DMD : Délégué militaire départemental", "DOS : Directeur des opérations de secours", "DREAL : Direction régionale de l'environnement, de l'aménagement et du logement", "DSAC : Direction de la sécurité de l'aviation civile", "EDF : Électricité de France", "EIC PACA : Établissement Infrastructure de Circulation PACA (SNCF)", "EMIZDS : État-major interministériel de zone de défense et de sécurité", "ENEDIS : Gestionnaire du réseau de distribution d'électricité (ex-ERDF)", "ESCOTA : Société des autoroutes Estérel Côte d'Azur Provence Alpes", "FR-ALERT : Système national d'alerte et d'information des populations par téléphone mobile", "GEDICOM : Outil de gestion de crise du COGIC (remontée des informations opérationnelles)", "GGD : Groupement de gendarmerie départementale", "GIM : Groupe d'intervention macrosismique", "GPMM : Grand Port Maritime de Marseille", "IFREMER : Institut français de recherche pour l'exploitation de la mer", "MAMP : Métropole Aix-Marseille-Provence", "NOVI : Nombreuses victimes", "ORSAN-CLIM : Organisation de la réponse du système de santé – volet canicule et chaleur extrême", "ORSEC : Organisation de la réponse de sécurité civile", "PC : Poste de commandement", "PCA : Poste de commandement avancé", "PCO : Poste de commandement opérationnel", "PCS : Plan communal de sauvegarde", "PIS : Poste d'information et de soins", "PMA : Poste médical avancé", "POLMAR : Plan de lutte contre les pollutions marines", "PPI : Plan particulier d'intervention", "PREMAR : Préfet maritime", "PSS : Plan de secours spécialisé", "RDT 13 : Régie des transports métropolitains (réseau de transport du département 13)", "RIC : Règlement de surveillance, de prévision et de transmission de l'information sur les crues", "RTE : Réseau de transport d'électricité", "SAIP : Système d'alerte et d'information des populations", "SAMU : Service d'aide médicale urgente", "SDIS : Service départemental d'incendie et de secours", "SERTIT : Service de traitement d'image et de télédétection (Université de Strasbourg)", "SINSIC : Service de l’innovation numérique et des systèmes d’information et de communication", "SINUS : Système d'information numérique unifié de suivi des victimes", "SIRACEDPC : Service interministériel régional des affaires civiles et économiques de défense et de la protection civile", "SNCF : Société nationale des chemins de fer français", "SPC : Service de prévision des crues", "SPZEF : Bulletin spécial de zone et espaces frontaliers (Météo-France)", "SRCI : Service régional de communication et d'information", "TMD : Transport de matières dangereuses", "VNF : Voies navigables de France", "ZA : Zone d'accueil", "ZVA : Zone de vie des victimes autonomes"]};
const DEFAULT_COMMAND_TYPES = [['Activation de la cellule de suivi',"J'active une cellule de suivi."],['Prise de direction des opérations',"Je prends la direction des opérations."],['Mise en oeuvre de certaines mesures d\'un dispositif ORSEC',"Je mets en oeuvre certaines mesures d'un dispositif ORSEC."],['Activation d\'un dispositif opérationnel ORSEC',"J'active un dispositif opérationnel ORSEC."],['Levée de certaines mesures d\'un dispositif ORSEC',"Je lève certaines mesures d'un dispositif ORSEC."],['Levée de l\'ensemble des mesures d\'un dispositif ORSEC',"Je lève l'ensemble des mesures des dispositions ORSEC mises en oeuvre."]];
let commandTypes = DEFAULT_COMMAND_TYPES.map(x => x.slice());

const defaultServices = ['SDIS','BMPM','SAMU','ARS','DDTM','DREAL','DZSI','DZPAF','GMAR','PP13','DDSP','GGD','CRS','DMD','MÉTROPOLE','SRCI','GPMM','DIPJ'].map(name => ({name, cod: false, pco: false}));

// ────────────────────────────────────────────────────────────────────────────
// 2. COUCHE STORAGE (isolée — [CF-STORAGE] : remplacer par API Cloudflare)
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
  dutyAgents: ['Agent 1','Agent 2'],
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

// Chargement unique de l'état
const _saved = Storage.load();
const state = Object.assign(buildDefaultState(), _saved || {});

function ensureStateIntegrity() {
  state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings || {});
  state.settings.remoteSync = Object.assign({}, DEFAULT_SETTINGS.remoteSync, state.settings.remoteSync || {});
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
  window.SICODDataModel?.ensureReferenceData(state, DEFAULT_DYNAMIC_LISTS);
  window.SICODDataModel?.migrateSnapshots(state);
  window.SICODPdfTemplates?.ensureState(state);
}

ensureStateIntegrity();
window.SICODApi?.system?.setRemoteConfig?.(state.settings.remoteSync);

// persist() — unique, stable
function persist() {
  Storage.save(state);
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

/** Parse une date locale ISO en objet Date (à midi pour éviter les décalages TZ) */
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

/** Retourne le lundi de la semaine contenant dt */
function startOfMonday(dt) {
  const d = new Date(dt);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Retourne le dimanche (fin inclusive) d'une semaine démarrant le lundi */
function weekEndInclusive(monday) {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(12, 0, 0, 0);
  return d;
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

/** Peuple un <select> avec des options */
function setSelectOptions(selectEl, items, selected) {
  if (!selectEl) return;
  selectEl.innerHTML = items.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if (selected !== undefined && items.includes(selected)) selectEl.value = selected;
}

/** Marque binaire pour les exports PDF */
function mark(v) { return v ? '[X]' : '[ ]'; }

/** Échappe une valeur pour CSV */
function csvEscape(v) {
  const s = String(v ?? '');
  return (s.includes('"') || s.includes(';') || s.includes(',') || s.includes('\n'))
    ? '"' + s.replace(/"/g, '""') + '"' : s;
}

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

/** Retourne la source logo courante (personnalisée ou défaut) */
const DEFAULT_BRAND_LOGO = 'assets/logo.png';
const DEFAULT_FAVICON = 'assets/favicon.ico';
const DEFAULT_DASHBOARD_BANNER = 'assets/banniere.png';

function currentLogoSrc() {
  const configured = (state.settings && state.settings.brandLogo) ? String(state.settings.brandLogo).trim() : '';
  return configured || DEFAULT_BRAND_LOGO;
}

function currentDashboardBannerSrc() {
  const configured = (state.settings && state.settings.dashboardBanner) ? String(state.settings.dashboardBanner).trim() : '';
  return configured || DEFAULT_DASHBOARD_BANNER;
}

function refreshDashboardBanner() {
  const wrap = document.getElementById('dashboardBannerWrap');
  const img = document.getElementById('dashboardBannerImage');
  if (!wrap || !img) return;
  const configured = (state.settings && state.settings.dashboardBanner) ? String(state.settings.dashboardBanner).trim() : '';
  const fallbacks = configured
    ? [configured, DEFAULT_DASHBOARD_BANNER, 'banniere.png']
    : [DEFAULT_DASHBOARD_BANNER, 'banniere.png'];
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
  const configured = (state.settings && state.settings.favicon) ? String(state.settings.favicon).trim() : '';
  return configured || DEFAULT_FAVICON;
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
    doc.addImage(src, type, x + (maxW - w) / 2, y + (maxH - h) / 2, w, h);
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
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
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

function getPSSignatureConfig() {
  return {
    mode: state.settings.psSignatureMode || 'delegation',
    name: state.settings.psSignatureName || 'Nicolas HAUPTMANN',
    role: state.settings.psSignatureRole || 'le directeur de cabinet'
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
  const collapsed = localStorage.getItem('sicod_sidebar_collapsed') === '1';
  layout.classList.toggle('sidebar-collapsed', collapsed);
}

function toggleSidebar() {
  const layout = document.getElementById('appLayout');
  if (!layout) return;
  const collapsed = !layout.classList.contains('sidebar-collapsed');
  layout.classList.toggle('sidebar-collapsed', collapsed);
  localStorage.setItem('sicod_sidebar_collapsed', collapsed ? '1' : '0');
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
  return `<div class="ps-cartouche"><table class="table"><thead><tr><th>Date / heure</th><th>Classification</th><th>Auteur</th><th>ID Synergi</th></tr></thead><tbody><tr><td>${esc(dateStr)}</td><td>${esc(ps.status||'')}</td><td>${esc(ps.classification||'')}</td><td>${esc(ps.author||'')}</td><td>${esc(event?.synergi||'')}</td></tr></tbody></table></div>`;
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

// ────────────────────────────────────────────────────────────────────────────
// 5. NAVIGATION
// ────────────────────────────────────────────────────────────────────────────

function goPage(page) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  if (page === 'fiches') renderFiches();
  if (page === 'ps') renderPSList();
  if (page === 'events') renderEvents();
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

// ────────────────────────────────────────────────────────────────────────────
// 6. MODULE DASHBOARD
// ────────────────────────────────────────────────────────────────────────────

function renderDashboard() {
  refreshDashboardBanner();
  const kpiEvents = document.getElementById('kpiEvents');
  const kpiPS = document.getElementById('kpiPS');
  const kpiArchived = document.getElementById('kpiArchived');
  const kpiTime = document.getElementById('kpiTime');
  const kpiPlansTotal = document.getElementById('kpiPlansTotal');
  const kpiPlansUpToDate = document.getElementById('kpiPlansUpToDate');
  const kpiPlansTodo = document.getElementById('kpiPlansTodo');
  const kpiPlansInProgress = document.getElementById('kpiPlansInProgress');

  const planItems = getActiveItems(state.planItems);
  const activeEvents = getActiveItems(state.events).filter(e => e.status !== 'Archivé');
  const archivedEvents = (state.events || []).filter(e => e && !e.deletedAt && e.status === 'Archivé');
  const activePS = getActiveItems(state.ps);
  const planStatusNorm = (value) => String(value || '').trim().toLowerCase();
  const isPlanUpToDate = (p) => planStatusNorm(p?.status) === 'a jour' || planStatusNorm(p?.status) === 'à jour';
  const isPlanTodo = (p) => planStatusNorm(p?.status) === 'a programmé' || planStatusNorm(p?.status) === 'à programmer' || planStatusNorm(p?.status) === 'a programmer';
  const isPlanInProgress = (p) => planStatusNorm(p?.status) === 'en cours';

  if (kpiEvents) kpiEvents.textContent = activeEvents.length;
  if (kpiPS) kpiPS.textContent = activePS.length;
  if (kpiArchived) kpiArchived.textContent = archivedEvents.length;
  if (kpiTime) kpiTime.textContent = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
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
    const week = (state.dutySchedule || []).find(w => w.start <= today && w.end >= today);
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
  if (!titleEl || !titleEl.value.trim()) { alert('Le libellé est requis.'); return; }
  const id = idEl?.value || uid('evt');
  const existing = byId(state.events, id);
  if (existing && existing.status === 'Archivé') { alert('Un événement archivé ne peut pas être modifié.'); return; }
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
  e.status = 'Archivé';
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

function deleteEvent(id) {
  if (!confirm('Supprimer cet événement et les points de situation rattachés ?')) return;
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
  if (!e) { alert('Sélectionnez un événement.'); return; }
  if (e.status === 'Archivé') { alert('Un événement archivé ne peut pas être enrichi.'); return; }
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
  if (e.status === 'Archivé') { alert('Un événement archivé ne peut pas être enrichi.'); return; }
  const title = (document.getElementById('eventLogTitle').value || '').trim();
  const detail = (document.getElementById('eventLogDetail').value || '').trim();
  const author = (document.getElementById('eventLogAuthor').value || '').trim() || 'SIRACEDPC';
  if (!title) { alert('Le titre est requis.'); return; }
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
    .filter(ps => ps.eventId === eventId && ['Validé','Diffusé'].includes(ps.status))
    .map(ps => ({
      date: ps.updatedAt || ps.createdAt || new Date().toISOString(),
      author: ps.author || 'SIRACEDPC',
      title: ps.title || `Point de situation ${ps.number || ''}`.trim(),
      detail: `Point de situation ${ps.number ? 'n° ' + ps.number : ''}${ps.status ? ' — ' + ps.status : ''}`
    }));
  const commandItems = getActiveItems(state.commandMessages)
    .filter(cmd => cmd.eventId === eventId && ['Validé','Diffusé'].includes(cmd.status))
    .map(cmd => ({
      date: cmd.updatedAt || cmd.createdAt || new Date().toISOString(),
      author: 'SIRACEDPC',
      title: `${cmd.typeLabel || 'Message de commandement'}${cmd.number ? ' n° ' + cmd.number : ''}`,
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
  header.innerHTML = `<h3>${esc(e.title)}</h3><div class="help">${esc(e.type || '—')} · ${esc(e.location || '—')} · ${esc(e.level || '—')}</div>`;
  const items = getEventTimelineItems(e.id);
  tableWrap.innerHTML = items.length ? `<table class="table"><thead><tr><th style="width:13rem">Date / heure</th><th style="width:10rem">Auteur</th><th>Entrée</th></tr></thead><tbody>${items.map(item => `<tr><td>${formatDateTimeValueFR(item.date)}</td><td>${esc(item.author || 'SIRACEDPC')}</td><td><div class="timeline-title">${esc(item.title || '')}</div><div>${nl2br(item.detail || '')}</div></td></tr>`).join('')}</tbody></table>` : '<p class="help">Aucune entrée de main courante.</p>';
}

function exportEventLogPDF() {
  const eventId = state.currentEventId;
  const e = byId(state.events, eventId);
  if (!e || !window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4' });

  addLogoPreserved(doc, 10, 8, 40, 18);

  doc.setTextColor(22,22,22);
  doc.setFont('helvetica','bold');
  doc.setFontSize(12);
  doc.text('CABINET', 200, 12, { align:'right' });
  doc.setFont('helvetica','bold');
  doc.text('SIRACEDPC', 200, 18, { align:'right' });

  doc.setTextColor(0, 0, 145);
  doc.setFont('helvetica','bold');
  doc.setFontSize(16);
  doc.text('MAIN COURANTE', 105, 34, { align:'center' });

  doc.setTextColor(22,22,22);
  doc.setFont('helvetica','bold');
  doc.setFontSize(12);
  doc.text(e.title || '', 10, 46);
  doc.setFont('helvetica','normal');
  doc.setFontSize(10);
  const exportStamp = new Date().toLocaleString('fr-FR');
  const sub = doc.splitTextToSize(`Type : ${e.type || '—'}\nCommune / localisation : ${e.location || '—'}\nNiveau de mobilisation : ${e.level || '—'}\nExporté le : ${exportStamp}`, 190);
  doc.text(sub, 10, 52);

  let y = 74;
  const items = getEventTimelineItems(eventId);
  const cols = [
    { x:10, w:38, title:'Date / heure' },
    { x:48, w:32, title:'Auteur' },
    { x:80, w:120, title:'Entrée' }
  ];

  const drawHeader = () => {
    doc.setFont('helvetica','bold');
    cols.forEach(c => {
      doc.setDrawColor(221,221,221);
      doc.setFillColor(245,245,254);
      doc.rect(c.x, y, c.w, 8, 'FD');
      doc.setTextColor(0,0,145);
      doc.text(c.title, c.x + 1.5, y + 5.2);
    });
    y += 8;
    doc.setTextColor(22,22,22);
    doc.setFont('helvetica','normal');
  };

  drawHeader();

  if (!items.length) {
    doc.text('Aucune entrée de main courante.', 10, y + 6);
  } else {
    items.forEach(item => {
      const entryText = `${item.title || ''}${item.detail ? '\n' + item.detail : ''}`;
      const lines1 = doc.splitTextToSize(formatDateTimeValueFR(item.date), cols[0].w - 3);
      const lines2 = doc.splitTextToSize(item.author || 'SIRACEDPC', cols[1].w - 3);
      const lines3 = doc.splitTextToSize(entryText, cols[2].w - 3);
      const rowH = Math.max(8, lines1.length*5+3, lines2.length*5+3, lines3.length*5+3);

      if (y + rowH > 285) {
        doc.addPage();
        y = 15;
        drawHeader();
      }

      doc.rect(cols[0].x, y, cols[0].w, rowH);
      doc.rect(cols[1].x, y, cols[1].w, rowH);
      doc.rect(cols[2].x, y, cols[2].w, rowH);
      doc.text(lines1, cols[0].x + 1.5, y + 4.8);
      doc.text(lines2, cols[1].x + 1.5, y + 4.8);
      doc.text(lines3, cols[2].x + 1.5, y + 4.8);
      y += rowH;
    });
  }

  doc.save(`main-courante-${(e.title || 'evenement').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.pdf`);
}

function renderEvents() {
  const eventList = document.getElementById('eventList');
  const archiveList = document.getElementById('archiveList');
  if (!eventList || !archiveList) return;

  const active = getActiveItems(state.events).filter(e => e.status !== 'Archivé');
  const archived = (state.events || []).filter(e => e && !e.deletedAt && e.status === 'Archivé');

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
        ${e.status === 'Archivé'
          ? `<button class="fr-btn secondary small" onclick="reactivateEvent('${e.id}')">Réactiver</button>
             <button class="fr-btn danger small" onclick="deleteEvent('${e.id}')">Supprimer</button>`
          : `<button class="fr-btn small" onclick="openEvent('${e.id}')">${openLabel}</button>
             <button class="fr-btn secondary small" onclick="openEventForm('${e.id}')">Modifier</button>
             <button class="fr-btn secondary small" onclick="archiveEvent('${e.id}')">Archiver</button>
             <button class="fr-btn danger small" onclick="deleteEvent('${e.id}')">Supprimer</button>`
        }
      </div>
    </div>`;
  };

  eventList.innerHTML = active.length ? active.map(tmpl).join('') : '<p class="help">Aucun événement actif.</p>';
  archiveList.innerHTML = archived.length ? archived.map(tmpl).join('') : '<p class="help">Aucune archive.</p>';
  updatePSEventSelect();
  populateCommuneDatalist();
  renderEventTimeline(state.currentEventId);
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
  const targetEventId = ps?.eventId || state.currentEventId || document.getElementById('psEvent')?.value || '';
  if (targetEventId && isEventArchived(targetEventId)) { alert('Les points de situation d’un événement archivé ne sont pas modifiables.'); return; }
  document.getElementById('psId').value = ps?.id || '';

  const psEvent = document.getElementById('psEvent');
  const firstActiveEvent = getActiveItems(state.events).find(e => e.status !== 'Archivé');
  if (psEvent) psEvent.value = ps?.eventId || state.currentEventId || firstActiveEvent?.id || '';

  document.getElementById('psAuthor').value = ps?.author || state.settings?.author || 'SIRACEDPC';
  document.getElementById('psStatus').value = ps?.status || 'Brouillon';
  document.getElementById('psClassification').value = ps?.classification || state.settings?.classification || 'Non protégé';
  document.getElementById('psFormat').value = ps?.format || state.settings?.psFormat || 'detail';
  document.getElementById('psTitle').value = ps?.title || '';
  document.getElementById('psSituation').value = ps?.situation || '';
  document.getElementById('psAttention').value = ps?.attention ?? ps?.points ?? '';
  document.getElementById('psMeans').value = ps?.means ?? ps?.moyens ?? '';
  document.getElementById('psMeasures').value = ps?.measures ?? ps?.mesures ?? '';
  document.getElementById('psCommunication').value = ps?.communication || '';
  document.getElementById('psImage').value = ps?.image || '';
  document.getElementById('psImageCaption').value = ps?.imageCaption || '';
  document.getElementById('psTranscript').value = ps?.transcript || '';
  document.getElementById('psDcd').value = ps?.bilan?.dcd ?? 0;
  document.getElementById('psUa').value = ps?.bilan?.ua ?? 0;
  document.getElementById('psUr').value = ps?.bilan?.ur ?? 0;
  document.getElementById('psImpliques').value = ps?.bilan?.impliques ?? 0;
  document.getElementById('psBilanNotes').value = ps?.bilan?.notes || '';

  updatePSImageThumb(ps?.image || '');

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
}

function savePS() {
  const idEl = document.getElementById('psId');
  const psEvent = document.getElementById('psEvent');
  const id = idEl?.value || uid('ps');
  const existing = byId(state.ps, id);
  const eventId = psEvent?.value || '';
  if (eventId && isEventArchived(eventId)) { alert('Impossible de modifier un point de situation rattaché à un événement archivé.'); return; }
  const siblings = state.ps.filter(p => p.eventId === eventId && p.id !== id);

  const audioEl = document.getElementById('psAudioPreview');
  // Ne stocker les données audio que si c'est un data URI (pas une blob URL non persistante)
  const audioData = audioEl?.src && audioEl.src.startsWith('data:') ? audioEl.src : (existing?.audioData || '');
  const format = document.getElementById('psFormat').value;
  const template = window.SICODPdfTemplates?.getTemplate(state, 'point_situation', format === 'focus' ? 'focus' : 'detail');

  const data = {
    id, eventId,
    author: (document.getElementById('psAuthor').value || '').trim() || state.settings?.author || 'SIRACEDPC',
    status: document.getElementById('psStatus').value,
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

  if (existing) Object.assign(existing, data);
  else state.ps.unshift(data);
  state.selectedPSId = id;
  state.currentEventId = eventId;
  persist();
  document.getElementById('psDialog').close();
  renderAll();
}

function deletePS(id) {
  if (!confirm('Supprimer ce point de situation ?')) return;
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

function renderPSList() {
  const psList = document.getElementById('psList');
  if (!psList) return;
  const source = getActiveItems(state.ps);
  const list = state.currentEventId
    ? source.filter(ps => ps.eventId === state.currentEventId)
    : source;
  const sorted = [...list].sort((a,b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  psList.innerHTML = sorted.length
    ? `<table class="table"><thead><tr><th>Horodatage</th><th>Numéro</th><th>Évènement</th><th>Statut</th><th>Action</th></tr></thead><tbody>${
        sorted.map(ps => `<tr>
          <td>${esc(formatDateTimeValueFR(ps.updatedAt || ps.createdAt || ''))}</td>
          <td>PS ${esc(ps.number || '')}</td>
          <td>${esc(getEventTitle(ps.eventId))}</td>
          <td>${badge(ps.status)}</td>
          <td><div class="list-actions">
            <button class="fr-btn secondary small ps-toggle-btn" type="button" onclick="selectPS('${ps.id}')">${state.selectedPSId === ps.id ? 'Fermer' : 'Ouvrir'}</button>
          </div></td>
        </tr>`).join('')
      }</tbody></table>`
    : '<p class="help">Aucun point de situation.</p>';
  renderPSPreview();
}

function renderPSHtml(ps) {
  if (!ps) return '<p class="help">Sélectionnez un point de situation.</p>';
  const event = byId(state.events, ps.eventId);
  const means = ps.means ?? ps.moyens ?? '';
  const measures = ps.measures ?? ps.mesures ?? '';
  const attention = ps.attention ?? ps.points ?? '';
  const title = `POINT DE SITUATION N° ${ps.number}`;
  const logo = currentLogoSrc();

  if (ps.format === 'focus') {
    return `<div class="ps-sheet focus-mode" style="max-width:74rem">
      <div class="ps-header">
        <img class="logo" src="${logo}" alt="">
        <div class="ps-title"><h2>${title}</h2><p>${esc(ps.title || getEventTitle(ps.eventId) || '')}</p></div>
        <div class="spacer"></div>
      </div>
      ${psCartouche(ps, event)}
      <div class="focus-grid">
        <div class="focus-col">
          <div class="focus-box"><div class="focus-label">Bilan</div><div class="focus-body">${bilanMini(ps)}</div></div>
          <div class="focus-box"><div class="focus-label">Moyens</div><div class="focus-body">${nl2br(means)}</div></div>
        </div>
        <div class="focus-center">
          <div class="focus-box"><div class="focus-label">Situation générale</div><div class="focus-body">${nl2br(ps.situation || '')}</div></div>
          <div class="focus-box"><div class="focus-label">Cartographie</div><div class="focus-map">${ps.image ? `<img src="${ps.image}" alt="Visuel">` : '<span class="note">Aucun visuel joint</span>'}</div></div>
          <div class="focus-box"><div class="focus-label">Mesures prises</div><div class="focus-body">${nl2br(measures)}</div></div>
        </div>
        <div class="focus-col focus-right">
          <div class="focus-box"><div class="focus-label">Points d'attention</div><div class="focus-body">${nl2br(attention)}</div></div>
          <div class="focus-box"><div class="focus-label">Communication</div><div class="focus-body">${nl2br(ps.communication || '')}${psSourcesHtml(ps)}</div></div>
        </div>
      </div>
      ${renderPSSignatureHtml()}
    </div>`;
  }

  return `<div class="ps-sheet" style="max-width:52rem">
    <div class="ps-header">
      <img class="logo" src="${logo}" alt="">
      <div class="ps-title"><h2>${title}</h2><p>${esc(ps.title || getEventTitle(ps.eventId) || '')}</p></div>
      <div class="spacer"></div>
    </div>
    ${psCartouche(ps, event)}
    <table class="ps-detail-table">
      <tr><td style="width:24%"><div class="ps-section-title">Situation générale</div></td><td><div class="ps-content">${nl2br(ps.situation || '')}</div></td></tr>
      <tr><td><div class="ps-section-title">Bilan</div></td><td><div class="ps-content">${bilanMini(ps)}</div></td></tr>
      <tr><td><div class="ps-section-title">Moyens engagés</div></td><td><div class="ps-content">${nl2br(means)}</div></td></tr>
      <tr><td><div class="ps-section-title">Mesures prises</div></td><td><div class="ps-content">${nl2br(measures)}</div></td></tr>
      <tr><td><div class="ps-section-title">Points d'attention</div></td><td><div class="ps-content">${nl2br(attention)}</div></td></tr>
      <tr><td><div class="ps-section-title">Communication</div></td><td><div class="ps-content">${nl2br(ps.communication || '')}</div></td></tr>
      ${ps.image ? `<tr><td><div class="ps-section-title">Visuel associé</div></td><td><div class="ps-content"><img src="${ps.image}" alt="Visuel" style="max-width:100%;max-height:18rem;width:auto;height:auto;display:block;margin:0 auto;object-fit:contain">${ps.imageCaption ? `<div class="source-note">${esc(ps.imageCaption)}</div>` : ''}</div></td></tr>` : ''}
      ${(ps.audioData || ps.transcript) ? `<tr><td><div class="ps-section-title">Sources</div></td><td><div class="ps-content">${psSourcesHtml(ps)}</div></td></tr>` : ''}
    </table>
    ${renderPSSignatureHtml()}
  </div>`;
}

function renderPSPreview() {
  const psPreview = document.getElementById('psPreview');
  if (!psPreview) return;
  const ps = state.selectedPSId ? byId(state.ps, state.selectedPSId) : null;
  psPreview.innerHTML = ps
    ? `<div class="preview-stage ps"><div class="document-page">${renderPSHtml(ps)}</div></div>`
    : '<p class="help">Sélectionnez un point de situation.</p>';
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
    alert('Enregistrement audio indisponible sur ce navigateur.');
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
  const signature = getPSSignatureConfig();
  const title = `POINT DE SITUATION N° ${ps.number}`;
  const contentTop = 42;
  const contentBottomReserve = (signature.name || signature.role) ? 18 : 8;
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

  const wrap = (txt, w) => doc.splitTextToSize(String(txt || '—'), w);

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
    doc.setTextColor(...blue);
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
      doc.text(String(v || '—'), x + widths[i] / 2, y + 12.2, { align: 'center', maxWidth: widths[i] - 2 });
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
      ? ['Pour le préfet, par délégation', signature.role || '', signature.name || ''].filter(Boolean)
      : ['Le préfet', signature.name || ''].filter(Boolean);
    const x = pageW - m - 68;
    const y = pageH - m - (lines.length * 4.5 + 2);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    lines.forEach((line, idx) => doc.text(line, x, y + idx * 4.8));
  };

  drawHeader();
  drawBilanBox(m, gridTop, col1W, box1TopH);
  drawTextBox(m, gridTop + box1TopH, col1W, box1BottomH, 'Moyens', means);
  drawTextBox(m + col1W, gridTop, col2W, centerTopH, 'Situation générale', ps.situation || '');
  drawTextBox(m + col1W, gridTop + centerTopH, col2W, centerMidH, 'Cartographie', ps.image || '', { image: true });
  drawTextBox(m + col1W, gridTop + centerTopH + centerMidH, col2W, centerBottomH, 'Mesures prises', measures);
  drawTextBox(m + col1W + col2W, gridTop, col3W, box3TopH, "Points d'attention", attention);
  drawTextBox(m + col1W + col2W, gridTop + box3TopH, col3W, box3BottomH, 'Communication', [ps.communication || '', ps.transcript ? `Transcription : ${ps.transcript}` : '', ps.audioData ? 'Source audio jointe.' : ''].filter(Boolean).join('\n\n'));
  drawSignature();
  doc.save(`PS_${ps.number || 'SICOD'}.pdf`);
}

function exportPSPDF() {
  const ps = state.selectedPSId ? byId(state.ps, state.selectedPSId) : null;
  if (!ps) { alert('Sélectionnez un point de situation.'); return; }
  const means = ps.means ?? ps.moyens ?? '';
  const measures = ps.measures ?? ps.mesures ?? '';
  const attention = ps.attention ?? ps.points ?? '';
  const event = byId(state.events, ps.eventId);
  const template = window.SICODPdfTemplates?.getTemplate(state, 'point_situation', ps.format === 'focus' ? 'focus' : 'detail');
  const { jsPDF } = window.jspdf;
  const landscape = (template?.layout?.orientation || (ps.format === 'focus' ? 'landscape' : 'portrait')) === 'landscape';
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' });
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight(), m = 10;
  const palette = getPdfAppearance();
  const blue = palette.primary, light = palette.accent, textColor = palette.text, border=[221,221,221];
  let y = m + 3;
  const signature = getPSSignatureConfig();

  const wrap = (txt, w) => doc.splitTextToSize(String(txt || '—'), w);

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
      try { doc.addImage(src, 'PNG', x + 2, yPos + 2, w - 4, h - 4, undefined, 'FAST'); } catch(e2) {}
    }
  };

  const drawLogo = () => addLogoPreserved(doc, m, y - 3, 22, 16);

  const addHeader = () => {
    drawLogo();
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue); doc.setFontSize(15);
    doc.text(`POINT DE SITUATION N° ${ps.number}`, pageW / 2, y + 3, { align: 'center' });
    doc.setFontSize(11); doc.setTextColor(...textColor); doc.setFont('helvetica', 'normal');
    doc.text(ps.title || getEventTitle(ps.eventId) || '', pageW / 2, y + 9, { align: 'center' });
    y += 15;
    const headers = ['Date / heure', 'Statut', 'Classification', 'Auteur', 'ID Synergi'];
    const values = [new Date(ps.updatedAt).toLocaleString('fr-FR', {dateStyle:'short',timeStyle:'short'}), ps.status, ps.classification, ps.author, event?.synergi || ''];
    const widths = landscape ? [54,38,52,70,pageW-m*2-54-38-52-70] : [34,26,36,58,pageW-m*2-34-26-36-58];
    let x = m;
    headers.forEach((h, i) => {
      doc.setFillColor(...light); doc.setDrawColor(...border); doc.rect(x, y, widths[i], 7, 'FD');
      doc.setTextColor(...blue); doc.setFont('helvetica','bold'); doc.setFontSize(8);
      doc.text(h, x + widths[i] / 2, y + 4.6, { align: 'center' });
      x += widths[i];
    });
    y += 7; x = m;
    values.forEach((v, i) => {
      doc.setDrawColor(...border); doc.rect(x, y, widths[i], 8);
      doc.setTextColor(...textColor); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      doc.text(String(v || '—'), x + widths[i] / 2, y + 5.2, { align: 'center', maxWidth: widths[i] - 2 });
      x += widths[i];
    });
    y += 11;
  };

  const needPage = (needed) => {
    if (y + needed > pageH - m) { doc.addPage(); y = m; addHeader(); }
  };

  const section = (label, body, forcedH, image) => {
    const width = pageW - m * 2;
    const lines = image ? [] : wrap(body, width - 4);
    const contentH = image ? (forcedH || 50) : (forcedH || Math.max(12, lines.length * 4.5 + 4));
    const totalH = 7 + contentH + 3;
    needPage(totalH);
    doc.setFillColor(...blue); doc.rect(m, y, width, 7, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(label, m + 2, y + 4.6); y += 7;
    if (image) {
      drawImageContain(body, m, y, width, contentH, 'Aucun visuel joint');
      y += contentH + 3; return;
    }
    doc.setDrawColor(...border); doc.rect(m, y, width, contentH);
    doc.setTextColor(...textColor); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(lines, m + 2, y + 5);
    y += contentH + 3;
  };

  const bilanTable = () => {
    const width = pageW - m * 2;
    const notes = ps.bilan?.notes ? wrap(ps.bilan.notes, width - 4) : [];
    const notesH = notes.length ? Math.max(10, notes.length * 4.2 + 4) : 0;
    const totalH = 7 + 7 + 8 + (notesH ? notesH + 2 : 0) + 4;
    needPage(totalH);
    doc.setFillColor(...blue); doc.rect(m, y, width, 7, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Bilan', m + 2, y + 4.6); y += 7;
    const headers = ['DCD', 'UA', 'UR', 'IMP'];
    const vals = [ps.bilan?.dcd||'', ps.bilan?.ua||'', ps.bilan?.ur||'', ps.bilan?.impliques||''];
    const w = width / 4; let x = m;
    headers.forEach(h => {
      doc.setFillColor(...light); doc.setDrawColor(...border); doc.rect(x, y, w, 7, 'FD');
      doc.setTextColor(...blue); doc.setFontSize(8); doc.setFont('helvetica','bold');
      doc.text(h, x + w / 2, y + 4.6, { align: 'center' }); x += w;
    });
    y += 7; x = m;
    vals.forEach(v => {
      doc.setDrawColor(...border); doc.rect(x, y, w, 8); doc.setTextColor(...textColor); doc.setFontSize(9); doc.setFont('helvetica','normal');
      doc.text(String(v || '—'), x + w / 2, y + 5, { align: 'center' }); x += w;
    });
    y += 8;
    if (notesH) {
      y += 2;
      doc.setDrawColor(...border); doc.rect(m, y, width, notesH);
      doc.setTextColor(...textColor); doc.setFontSize(8.5);
      doc.text(notes, m + 2, y + 5);
      y += notesH;
    }
    y += 3;
  };

  const signatureBlock = () => {
    if (!signature.name && !signature.role) return;
    const lines = signature.mode === 'delegation'
      ? ['Pour le préfet, par délégation', signature.role || '', signature.name || ''].filter(Boolean)
      : ['Le préfet', signature.name || ''].filter(Boolean);
    const w = 68;
    const h = Math.max(14, lines.length * 5 + 6);
    needPage(h + 2);
    const x = pageW - m - w;
    doc.setTextColor(...textColor); doc.setFont('helvetica','normal'); doc.setFontSize(10);
    lines.forEach((line, idx) => {
      doc.text(line, x, y + 5 + idx * 5);
    });
    y += h;
  };

  const sourceText = [ps.communication || '', ps.transcript ? `Transcription : ${ps.transcript}` : '', ps.audioData ? 'Source audio jointe.' : ''].filter(Boolean).join('\\n\\n');
  const bodyByField = {
    situation: ps.situation || '',
    bilan: ps.bilan || {},
    means,
    measures,
    attention,
    communication: ps.communication || '',
    image: ps.image || '',
    sources: sourceText
  };

  addHeader();
  (template?.layout?.sections || []).forEach(block => {
    const value = bodyByField[block.field];
    if (block.optional && !value) return;
    if (block.type === 'bilan') {
      bilanTable();
      return;
    }
    if (block.type === 'image') {
      if (block.optional && !value) return;
      section(block.title, value, block.forcedHeight, true);
      return;
    }
    section(block.title, value, block.forcedHeight, false);
  });
  signatureBlock();
  doc.save(`PS_${ps.number || 'SICOD'}.pdf`);
}

// openPrintWindow : alias vers exportPSPDF
function openPrintWindow() { exportPSPDF(); }


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
  if(!cmd || !cmd.eventId || !['Validé','Diffusé'].includes(cmd.status)) return;
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
    status: 'Ouvert',
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
  const d = existing ? JSON.parse(JSON.stringify(existing)) : getDefaultCommandMessage();
  document.getElementById('commandId').value = d.id || '';
  document.getElementById('cmdType').innerHTML = commandTypes.map(([label], i) => `<option value="${i}">${esc(label)}</option>`).join('');
  populateCommandEventSelect(d.eventId || '');
  document.getElementById('cmdDate').value = d.date || todayISO();
  document.getElementById('cmdTime').value = d.time || timeHHMM();
  document.getElementById('cmdType').value = String(d.typeIndex || 0);
  document.getElementById('cmdEvent').value = d.eventId || '';
  document.getElementById('cmdStatus').value = d.status || 'Ouvert';
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
  if (existing) Object.assign(existing, payload);
  else state.commandMessages.unshift(payload);
  state.selectedCommandId = id;
  injectCommandIntoEventLog(existing || payload);
  persist();
  document.getElementById('commandDialog').close();
  renderAll();
  renderCommandPreview(byId(state.commandMessages, id));
}

function deleteSelectedCommand() {
  if (!state.selectedCommandId) { alert('Sélectionnez un message de commandement'); return; }
  const record = byId(state.commandMessages, state.selectedCommandId);
  if (!record) return;
  if (!confirm('Supprimer ce message de commandement ?')) return;
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

function renderCommandList() {
  const el = document.getElementById('commandList');
  if (!el) return;
  const items = [...getActiveItems(state.commandMessages)]
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  if (!items.length) {
    el.innerHTML = '<p class="help">Aucun message de commandement enregistré.</p>';
    return;
  }
  el.innerHTML = `<table class="table"><thead><tr><th>Horodatage</th><th>Numéro</th><th>Évènement</th><th>Statut</th><th>Action</th></tr></thead><tbody>${
    items.map(item => `<tr class="${item.id === state.selectedCommandId ? 'is-selected' : ''}">
      <td>${esc(formatDateTimeValueFR(item.updatedAt || item.createdAt || ''))}</td>
      <td><button class="table-title-btn" type="button" onclick="selectCommand('${item.id}')">Message ${esc(item.number || '')}<span class="table-meta">${esc(item.typeLabel || '')}</span></button></td>
      <td>${esc(item.event || getEventTitle(item.eventId) || 'Évènement supprimé')}</td>
      <td>${badge(item.status)}</td>
      <td><div class="list-actions"><button class="fr-btn secondary small" type="button" onclick="toggleCommandPreview('${item.id}')">${item.id === state.selectedCommandId ? 'Fermer' : 'Ouvrir'}</button></div></td>
    </tr>`).join('')
  }</tbody></table>`;
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
    <input value="${esc(svc.name)}" placeholder="Service / entité" oninput="state.services[${i}].name=this.value;renderCommandPreview(getCommandData())">
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
    status: document.getElementById('cmdStatus')?.value || 'Ouvert',
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
    commandPreview.innerHTML = '<p class="help">Sélectionnez un message de commandement.</p>';
    return;
  }
  const contactPhone = state.settings.commandPhone || '04 84 35 40 00 (standard)';
  const contactFax = state.settings.commandFax || '04 84 35 41 85';
  const contactEmail = state.settings.commandEmail || 'pref-pccrise-13@bouches-du-rhone.gouv.fr';
  const contactAudioConf = state.settings.commandAudioConf || '01 43 12 42 30 puis le 13603 suivi de #';
  const sig = getCommandSignatureConfig();
  const sigHtml = sig.mode === 'delegation'
    ? `<div><strong>Pour le préfet, par délégation</strong><div>${esc(sig.role || '')}</div><div>${esc(sig.name || '')}</div></div>`
    : `<div><strong>Le préfet,</strong><div>${esc(sig.name || '')}</div></div>`;
  commandPreview.innerHTML = `<div class="preview-stage command">
    <div class="document-page">
    <div class="command-sheet ${d.exercise ? 'exercise' : ''}">
      <div class="exercise-banner">EXERCICE - EXERCICE - EXERCICE</div>
      <div class="cmd-header">
        <img class="cmd-logo" src="${currentLogoSrc()}" alt="">
        <div class="cmd-headtext">
          <div style="font-size:.875rem;line-height:1.45;text-align:left;margin-bottom:.5rem">
            <div><strong>SIRACEDPC</strong></div>
            <div>Téléphone : ${esc(contactPhone)}</div>
            <div>Télécopie : ${esc(contactFax)}</div>
            <div>Courriel : ${esc(contactEmail)}</div>
            <div>Audio-conf. : ${esc(contactAudioConf)}</div>
          </div>
          <div class="meta-line"><table class="table"><tbody><tr><th>Date</th><th>Heure</th></tr><tr><td>${esc(d.date)}</td><td>${esc(d.time)}</td></tr></tbody></table></div>
          <p class="cmd-redtitle">${esc((d.typeLabel || '').toUpperCase())}</p>
          <h2>${esc(d.event || 'ÉVÉNEMENT À RENSEIGNER')}</h2>
          <div class="help">Site / lieu de l’événement : ${esc(d.site || '')}</div>
        </div>
      </div>
      <div class="cmd-urgent">MESSAGE URGENT</div>
      <p class="cmd-autotext">${esc(d.autoText || '')}</p>
      <div class="meta-line"><table class="table"><thead><tr><th>Dispositif de référence</th><th>Heure d'activation</th><th>Localisation du PCO</th></tr></thead><tbody><tr><td>${esc(d.reference || '')}</td><td>${esc(d.activation || '')}</td><td>${esc(d.pcoLocation || '')}</td></tr></tbody></table></div>
      <table class="table"><tbody>
        <tr><th style="width:78%">Mesures</th><th>Valeur</th></tr>
        <tr><td>Activation de la cellule de suivi</td><td>${mark(d.suivi)}</td></tr>
        <tr><td>Prise de direction des opérations / activation du COD</td><td>${mark(d.cod)}</td></tr>
        <tr><td>Activation du PCO</td><td>${mark(d.pco)}</td></tr>
        <tr><td>Activation du plan de référence</td><td>${mark(d.planActive)}${d.plan ? ` — ${esc(d.plan)}` : ''}</td></tr>
        <tr><td>Mise en oeuvre limitée à certaines mesures</td><td>${mark(d.limited)}</td></tr>
        <tr><td>Activation d'une alerte sirène</td><td>${mark(d.siren)}${d.sirenLabel ? ` — ${esc(d.sirenLabel)}` : ''}</td></tr>
      </tbody></table>
      <div style="margin-top:1rem"><table class="table"><thead><tr><th>Services / entités</th><th>COD</th><th>PCO</th></tr></thead><tbody>${(d.services || []).map(s => `<tr><td>${esc(s.name)}</td><td>${mark(s.cod)}</td><td>${mark(s.pco)}</td></tr>`).join('')}</tbody></table></div>
      <div style="margin-top:1.25rem;display:flex;justify-content:flex-end;text-align:right">${sigHtml}</div>
      <div style="margin-top:.75rem;text-align:right"><strong>${d.originalSigned ? 'Original signé' : ''}</strong></div>
      <div class="exercise-banner" style="margin-top:1rem;display:${d.exercise ? 'block' : 'none'}">EXERCICE - EXERCICE - EXERCICE</div>
    </div>
    </div>
  </div>`;
}

function exportCommandPDF() {
  const d = state.selectedCommandId ? byId(state.commandMessages, state.selectedCommandId) : null;
  if (!d) { alert('Sélectionnez un message de commandement'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const palette = getPdfAppearance();
  const pageW = 210, margin = 10, blue = palette.primary, soft = palette.accent, red = palette.alert, text = palette.text;
  const pageH = 297;
  let y = 10;
  const contactPhone = state.settings.commandPhone || '04 84 35 40 00 (standard)';
  const contactFax = state.settings.commandFax || '04 84 35 41 85';
  const contactEmail = state.settings.commandEmail || 'pref-pccrise-13@bouches-du-rhone.gouv.fr';
  const contactAudioConf = state.settings.commandAudioConf || '01 43 12 42 30 puis le 13603 suivi de #';

  const cell = (x, yy, w, h, txt, opts = {}) => {
    if (opts.fill) { doc.setFillColor(...opts.fill); doc.rect(x, yy, w, h, 'F'); }
    doc.rect(x, yy, w, h);
    doc.setTextColor(...(opts.color || text));
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size || 8.3);
    const lines = doc.splitTextToSize(String(txt || ''), w - 3);
    doc.text(lines, opts.center ? x + w / 2 : x + 1.7, yy + 4.6, opts.center ? { align: 'center' } : {});
  };
  const cellHeight = (txt, w, min = 8, size = 8.3) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(txt || ''), w - 3);
    return Math.max(min, 4 + (Math.max(lines.length, 1) * 4.3));
  };
  const ensureSpace = (needed) => {
    if (y + needed <= pageH - 15) return;
    doc.addPage();
    y = 12;
  };

  if (d.exercise) {
    doc.setTextColor(...red); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('EXERCICE - EXERCICE - EXERCICE', pageW / 2, y, { align: 'center' }); y += 5;
  }

  addLogoPreserved(doc, margin, y, 24, 18);
  doc.setTextColor(...text); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('SIRACEDPC', 38, y + 3.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Téléphone : ${contactPhone}`, 38, y + 8);
  doc.text(`Télécopie : ${contactFax}`, 38, y + 12);
  doc.text(`Courriel : ${contactEmail}`, 38, y + 16);
  doc.text(`Audio-conf. : ${contactAudioConf}`, 38, y + 20);

  cell(160, y, 18, 8, 'Date', { fill: soft, color: blue, bold: true, center: true });
  cell(178, y, 22, 8, 'Heure', { fill: soft, color: blue, bold: true, center: true });
  cell(160, y + 8, 18, 8, d.date || '', { center: true });
  cell(178, y + 8, 22, 8, d.time || '', { center: true });
  y += 22;

  doc.setTextColor(...red); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text(doc.splitTextToSize((d.typeLabel || '').toUpperCase(), pageW - 30), pageW / 2, y, { align: 'center', maxWidth: pageW - 30 });
  y += 6;
  doc.setTextColor(...text); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  const eventLines = doc.splitTextToSize(d.event || 'ÉVÉNEMENT À RENSEIGNER', pageW - 30);
  doc.text(eventLines, pageW / 2, y, { align: 'center' });
  y += Math.max(5, eventLines.length * 4.6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  const siteLines = doc.splitTextToSize('Site / lieu de l’événement : ' + (d.site || ''), pageW - 30);
  doc.text(siteLines, pageW / 2, y, { align: 'center' });
  y += Math.max(5, siteLines.length * 4.2);

  cell(margin, y, pageW - margin * 2, 8, 'MESSAGE URGENT', { fill: soft, color: blue, bold: true, center: true, size: 10 });
  y += 10;
  doc.setTextColor(...text); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  const introLines = doc.splitTextToSize(d.autoText || '', pageW - margin * 2);
  doc.text(introLines, margin, y);
  y += Math.max(8, introLines.length * 4.3);

  const widths = [60, 35, pageW - margin * 2 - 95];
  let x = margin;
  ['Dispositif de référence', "Heure d'activation", 'Localisation du PCO'].forEach((h, i) => {
    cell(x, y, widths[i], 8, h, { fill: soft, color: blue, bold: true, center: true });
    x += widths[i];
  });
  y += 8; x = margin;
  [d.reference || '', d.activation || '', d.pcoLocation || ''].forEach((v, i) => {
    cell(x, y, widths[i], 8, v, { center: i > 0 });
    x += widths[i];
  });
  y += 10;

  const measures = [
    ["Activation de la cellule de suivi", mark(d.suivi)],
    ['Prise de direction des opérations / activation du COD', mark(d.cod)],
    ['Activation du PCO', mark(d.pco)],
    ['Activation du plan de référence', mark(d.planActive) + (d.plan ? ' — ' + d.plan : '')],
    ['Mise en oeuvre limitée à certaines mesures', mark(d.limited)],
    ["Activation d'une alerte sirène", mark(d.siren) + (d.sirenLabel ? ' — ' + d.sirenLabel : '')]
  ];
  cell(margin, y, 145, 8, 'MESURES', { fill: soft, color: blue, bold: true, center: true });
  cell(margin + 145, y, pageW - margin * 2 - 145, 8, 'VALEUR', { fill: soft, color: blue, bold: true, center: true });
  y += 8;
  measures.forEach(r => {
    const h = Math.max(cellHeight(r[0], 145), cellHeight(r[1], pageW - margin * 2 - 145));
    ensureSpace(h);
    cell(margin, y, 145, h, r[0], {});
    cell(margin + 145, y, pageW - margin * 2 - 145, h, r[1], { center: false });
    y += h;
  });

  ensureSpace(16);
  cell(margin, y, 120, 8, 'SERVICES / ENTITÉS', { fill: soft, color: blue, bold: true, center: true });
  cell(margin + 120, y, 35, 8, 'COD', { fill: soft, color: blue, bold: true, center: true });
  cell(margin + 155, y, pageW - margin * 2 - 155, 8, 'PCO', { fill: soft, color: blue, bold: true, center: true });
  y += 8;
  (d.services || []).forEach(s => {
    const h = cellHeight(s.name || '', 120, 7);
    ensureSpace(h + 2);
    cell(margin, y, 120, h, s.name || '', {});
    cell(margin + 120, y, 35, h, mark(s.cod), { center: true });
    cell(margin + 155, y, pageW - margin * 2 - 155, h, mark(s.pco), { center: true });
    y += h;
  });

  if (shouldApplyPdfSignature('command')) {
    y = Math.min(y + 12, 270);
    drawPdfSignatureBlock(doc, pageW - 62, y, { signature: getCommandSignatureConfig(), lineGap: 5, blockWidth: 50 });
    if (d.originalSigned) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...text);
      doc.text('Original signé', pageW - margin, Math.min(y + 18, 285), { align: 'right' });
    }
  }

  if (d.exercise) {
    doc.setTextColor(...red); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('EXERCICE - EXERCICE - EXERCICE', pageW / 2, 292, { align: 'center' });
  }
  doc.save(`message-commandement-${slugify(d.event || d.typeLabel || 'document')}.pdf`);
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
  const familySelect = document.getElementById('ficheFamily');
  const familyOptions = Array.from(new Set([...getDynamicList('reflexFamilies'), ...fiches.map(f => f.family).filter(Boolean), fiche?.family || ''])).filter(Boolean);
  setSelectOptions(familySelect, familyOptions, fiche?.family || familyOptions[0] || 'Autres');
  document.getElementById('ficheId').value = fiche?.code || '';
  document.getElementById('ficheCode').value = fiche?.code || '';
  document.getElementById('ficheTitle').value = fiche?.title || '';
  document.getElementById('ficheSections').value = formatFicheSections(fiche?.sections || []);
  ficheDialog.showModal();
}

function saveFiche() {
  const fiches = getReflexFiches();
  const originalCode = document.getElementById('ficheId').value.trim();
  const code = document.getElementById('ficheCode').value.trim();
  const title = document.getElementById('ficheTitle').value.trim();
  const familySnapshot = getReferenceSnapshot('reflexFamilies', document.getElementById('ficheFamily').value.trim() || getDynamicList('reflexFamilies')[0] || 'Autres');
  const sections = parseFicheSections(document.getElementById('ficheSections').value);
  if (!code || !title) { alert('Renseignez au minimum le code et le titre.'); return; }
  if (!sections.length) { alert('Ajoutez au moins une section avec du contenu.'); return; }
  const duplicate = fiches.find(f => f.code === code && f.code !== originalCode);
  if (duplicate) { alert('Une fiche avec ce code existe déjà.'); return; }
  const payload = { code, title, family: familySnapshot.label, familyId: familySnapshot.id, familyLabelSnapshot: familySnapshot.label, sections };
  const index = fiches.findIndex(f => f.code === originalCode);
  if (index >= 0) fiches[index] = payload;
  else fiches.push(payload);
  fiches.sort((a, b) => `${a.family} ${a.code}`.localeCompare(`${b.family} ${b.code}`, 'fr'));
  state.reflexFiches = fiches;
  state.selectedFiche = code;
  persist();
  ficheDialog.close();
  renderFiches();
}

function deleteSelectedFiche() {
  if (!state.selectedFiche || state.selectedFiche === 'glossary') return;
  const fiches = getReflexFiches();
  const fiche = fiches.find(f => f.code === state.selectedFiche);
  if (!fiche) return;
  if (!confirm(`Supprimer la fiche ${fiche.code} · ${fiche.title} ?`)) return;
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

  const fiches = getReflexFiches();
  const glossary = getReflexGlossary();
  const groups = {};
  fiches.forEach(f => { (groups[f.family] ||= []).push(f); });

  ficheNav.innerHTML = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(([family, items]) =>
    `<div class="group"><h3>${esc(family)}</h3>${
      items.sort((a, b) => `${a.code} ${a.title}`.localeCompare(`${b.code} ${b.title}`, 'fr')).map(f => `<button class="fiche-link ${state.selectedFiche === f.code ? 'active' : ''}" onclick="selectFiche('${esc(f.code)}')">${esc(f.code)} · ${esc(f.title)}</button>`).join('')
    }</div>`
  ).join('') + `<div class="group"><h3>Compléments</h3><button class="fiche-link ${state.selectedFiche === 'glossary' ? 'active' : ''}" onclick="selectFiche('glossary')">Glossaire</button></div>`;

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
  ficheContent.innerHTML = `<div class="fiche-toolbar"><button class="fr-btn secondary small" type="button" onclick="openFicheForm('${esc(fiche.code)}')">Modifier</button><button class="fr-btn danger small" type="button" onclick="deleteSelectedFiche()">Supprimer</button></div><h2>${esc(fiche.code)} · ${esc(fiche.title)}</h2><div class="fiche-meta"><span><strong>Famille :</strong> ${esc(fiche.family)}</span></div>${
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
  if (!fiches.length || !window.jspdf) { alert('Aucune fiche à exporter.'); return; }
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
    doc.setTextColor(...blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Fiche réflexe', margin + 24, y + 7);
    doc.setFontSize(14);
    doc.text(`${fiche.code} · ${fiche.title}`, margin, y + 28);
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
        const lines = doc.splitTextToSize(`• ${String(item || '')}`, pageW - margin * 2 - 4);
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

// ────────────────────────────────────────────────────────────────────────────
// 11. MODULE ANNUAIRE
// ────────────────────────────────────────────────────────────────────────────

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
  if (!data.name) { alert('Le nom du contact est requis.'); return; }
  if (existing) Object.assign(existing, data);
  else state.contacts.push(data);
  persist();
  document.getElementById('contactDialog').close();
  renderDirectory();
}

function deleteContact(id) {
  if (!confirm('Supprimer ce contact ?')) return;
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
      <div class="card-body"><table class="table"><thead><tr><th>Entité</th><th>Fonction</th><th>Nom</th><th>Téléphone 1</th><th>Téléphone 2</th><th>e-mail 1</th><th>e-mail 2</th><th>Actions</th></tr></thead><tbody>${
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
  }).join('') || '<p class="help">Aucun contact enregistré.</p>';
}

function exportContactsCSV() {
  const rows = [['Groupe','Entité','Fonction','Nom','Téléphone 1','Téléphone 2','e-mail 1','e-mail 2'],
    ...getActiveItems(state.contacts).map(c => [c.group,c.entity||'',c.function||'',c.name,c.phone1||'',c.phone2||'',c.email1||'',c.email2||''])];
  downloadCSV('annuaire.csv', rows);
}

function importContactsCSV(file) {
  if (!file) return;
  file.text().then(text => {
    const lines = text.replaceAll('\r', '').split('\n').filter(Boolean);
    const data = lines.slice(1).map(line => line.split(/[;,]/).map(v => v.replace(/^"|"$/g, '')));
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
    });
    persist();
    renderDirectory();
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
      doc.text('Bouches-du-Rhône', pageW / 2, 23, { align: 'center' });
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
    const headers = ['Fonction', 'Nom', 'Entité', 'Téléphone 1', 'Téléphone 2', 'E-mail'];
    let x = margin;
    doc.setFillColor(...headerFill);
    doc.setDrawColor(221, 221, 221);
    doc.setTextColor(...blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    headers.forEach((h, i) => {
      doc.rect(x, y, cols[i], 7, 'FD');
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

    const entities = [...new Set(groupItems.map(c => (c.entity || '').trim() || 'Sans entité'))];
    entities.forEach(entity => {
      const entityItems = groupItems.filter(c => (((c.entity || '').trim() || 'Sans entité') === entity));
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
          doc.text(lines, x + 1.5, y + 4.5);
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
    doc.text('Aucun contact enregistré.', margin, y);
  }

  doc.save('annuaire.pdf');
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
  const logoVal = t?.logo || guessFavicon(t?.url || '');
  document.getElementById('toolLogo').value = logoVal;
  updateToolThumb(logoVal);
  document.getElementById('toolDialog').showModal();
}

function saveTool() {
  const id = document.getElementById('toolId').value || uid('tool');
  const existing = byId(state.tools, id);
  const urlVal = document.getElementById('toolUrl').value.trim();
  const logo = document.getElementById('toolLogo').value.trim() || guessFavicon(urlVal);
  const data = {
    id,
    name: document.getElementById('toolName').value.trim(),
    url: urlVal,
    description: document.getElementById('toolDescription').value.trim(),
    username: document.getElementById('toolUsername').value.trim(),
    password: document.getElementById('toolPassword').value.trim(),
    logo
  };
  if (!data.name || !data.url) { alert("Le nom et l'URL de l'outil sont requis."); return; }
  if (existing) Object.assign(existing, data);
  else state.tools.unshift(data);
  persist();
  document.getElementById('toolDialog').close();
  renderTools();
}

function deleteTool(id) {
  if (!confirm('Supprimer cet outil ?')) return;
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
          <img class="tool-logo" src="${esc(t.logo || guessFavicon(t.url) || 'assets/icons/Icones/System/apps-2-line.svg')}" alt="">
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
  document.getElementById('planObservation').value = p?.observation || '';
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
    observation: document.getElementById('planObservation').value.trim()
  };
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

  const items = getActiveItems(state.planItems);
  planningList.innerHTML = items.length
    ? `<table class="table"><thead><tr><th>Type</th><th>Risque</th><th>Item</th><th>Priorité</th><th>Statut</th><th>Date d'approbation</th><th>Observation</th><th>Actions</th></tr></thead><tbody>${
        items.map(p => `<tr>
          <td>${esc(p.type || '')}</td>
          <td>${esc(p.risk || '')}</td>
          <td>${esc(p.item || '')}</td>
          <td>${esc(p.priority || '')}</td>
          <td>${badge(p.status || '')}</td>
          <td>${esc(p.approvalDate || '')}</td>
          <td>${esc(p.observation || '')}</td>
          <td><div class="list-actions plan-actions-single">
            <button class="fr-btn secondary small" type="button" onclick="openPlanForm('${p.id}')">Modifier</button>
          </div></td>
        </tr>`).join('')
      }</tbody></table>`
    : '<p class="help">Aucun item de planification.</p>';

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
  const items = getActiveItems(state.planItems);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const palette = getPdfAppearance();
  const blue = palette.primary, soft = palette.accent, text = palette.text; let y = 10;
  addLogoPreserved(doc, 10, y, 30, 16);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...text); doc.setFontSize(16);
  doc.text('PLANIFICATION DES PLANS', 148.5, y + 9, { align: 'center' }); y += 20;
  const headers = ['Type','Risque','Item','Priorité','Statut','Approbation','Observation'];
  const widths = [28,40,60,24,28,26,81];
  const drawHeader = () => {
    let x = 10;
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
    if (y + h > 200) { doc.addPage(); y = 10; addLogoPreserved(doc, 10, y, 30, 16); doc.setFont('helvetica','bold'); doc.setTextColor(...text); doc.setFontSize(16); doc.text('PLANIFICATION DES PLANS', 148.5, y + 9, { align: 'center' }); y += 20; drawHeader(); }
    let x = 10;
    lines.forEach((l, i) => { doc.setDrawColor(180); doc.rect(x, y, widths[i], h); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(l, x + widths[i] / 2, y + 4.5, { align: 'center', maxWidth: widths[i]-3 }); x += widths[i]; });
    y += h;
  });
  doc.save('planification.pdf');
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
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const s = getPlanningStatsData();
  addPdfHeader(doc, 'STATISTIQUES DE PLANIFICATION');
  let y = 34;
  [['Plans par type',s.types],['Répartition par statut',s.statuses],['Priorités',s.priorities],['Typologies de risque',s.risks],["Dates d'approbation par année",s.years]].forEach(([title,data]) => { y = addPdfStatTable(doc, y, title, data); });
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
    ? `<table class="table"><thead><tr><th>Agent</th><th>Rôle</th><th>Période</th><th>Observation</th><th>Actions</th></tr></thead><tbody>${
        items.map(a => `<tr>
          <td>${esc(a.agent)}</td><td>${esc(a.role)}</td>
          <td>${esc(a.start)} → ${esc(a.end)}</td><td>${esc(a.note||'')}</td>
          <td><div class="list-actions">
            <button class="fr-btn secondary small" type="button" onclick="openDutyAvailabilityForm('${a.id}')">Modifier</button>
            <button class="fr-btn danger small" type="button" onclick="deleteDutyAvailability('${a.id}')">Supprimer</button>
          </div></td>
        </tr>`).join('')
      }</tbody></table>`
    : '<p class="help">Aucune disponibilité saisie.</p>';
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
    html += `<div class="calendar-cell" style="opacity:${inMonth ? 1 : .5}"><div class="calendar-daynum">${day.getDate()}</div><div class="calendar-tags">${tags.map(t => `<span class="calendar-tag">${esc(t.agent)} · ${esc(t.role)}</span>`).join('')}</div></div>`;
  }
  html += '</div>';
  dutyCalendar.innerHTML = html;
}

function generateDutySchedule() {
  const startVal = document.getElementById('dutyPeriodStart')?.value || todayISO();
  const endVal = document.getElementById('dutyPeriodEnd')?.value || startVal;
  const startInput = parseDateLocal(startVal), endInput = parseDateLocal(endVal);
  if (!startInput || !endInput || endInput < startInput) { alert('Définissez une période de planning valide.'); return; }

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
    : '<p class="help">Aucun planning généré.</p>';

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
  if (!(state.dutySchedule || []).length) { alert("Générez d'abord le planning d'astreinte."); return; }
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
  doc.text("TABLEAU DES MISES SOUS ASTREINTES QUALIFIÉES « COD »", pageW / 2, y + 24, { align: 'center' });
  y += 34; doc.setTextColor(...text); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const startDateStr = state.dutySchedule[0]?.start || '';
  const endDateStr = state.dutySchedule[state.dutySchedule.length - 1]?.end || '';
  const startPeriod = parseDateLocal(document.getElementById('dutyPeriodStart')?.value || startDateStr);
  const endPeriod = parseDateLocal(document.getElementById('dutyPeriodEnd')?.value || endDateStr);
  const introText = `Les astreintes qualifiées « défense et sécurité civiles », pour la période comprise entre le ${startPeriod ? formatDateLocal(startPeriod) : '...'} et le ${endPeriod ? formatDateLocal(endPeriod) : '...'}, doivent être prises en compte comme suit :`;
  doc.text(doc.splitTextToSize(introText, 186), m, y); y += 14;
  const headers = ['Période', 'Astreinte 1', 'Astreinte 2'];
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
      w.agent1?.name || '—',
      w.agent2?.name || '—'
    ];
    const lines = vals.map((v, i) => doc.splitTextToSize(v, widths[i] - 4));
    const h = Math.max(...lines.map(l => l.length)) * 4 + 4;
    if (y + h > 250) { doc.addPage(); y = 10; addLogoPreserved(doc, m, y, 28, 18); doc.setTextColor(...text); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text('CABINET', pageW - m, y + 5, {align:'right'}); doc.text('SIRACEDPC', pageW - m, y + 11, {align:'right'}); doc.setFontSize(13); doc.text("TABLEAU DES MISES SOUS ASTREINTES QUALIFIÉES « COD »", pageW / 2, y + 24, { align: 'center' }); y += 34; drawHeader(); }
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
  doc.text('Place Félix Baret - CS 80001 – 13282 Marseille Cedex 06', m, y); y += 4;
  doc.text('Téléphone : 04.84.35.40.00 — www.bouches-du-rhone.gouv.fr', m, y);
  doc.save('planning-astreinte.pdf');
}

// ────────────────────────────────────────────────────────────────────────────
// 16. MODULE STATISTIQUES ASTREINTES
// ────────────────────────────────────────────────────────────────────────────

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
    ${buildBarChart(`${s.role1} — répartition annuelle`, s.a1)}
    ${buildBarChart(`${s.role2} — répartition annuelle`, s.a2)}
  </div>`;
}

function exportDutyStatsCSV() {
  const year = Number(document.getElementById('dutyStatsYear')?.value || new Date().getFullYear());
  const s = getDutyStatsData(year);
  const rows = [['Année','Rôle','Agent','Semaines']];
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
  y = addPdfStatTable(doc, y, `${s.role1} — répartition annuelle`, s.a1);
  y = addPdfStatTable(doc, y, `${s.role2} — répartition annuelle`, s.a2);
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
  stats.innerHTML = `<div class="card"><div class="card-header"><h2 class="card-title">Statistiques annuelles des astreintes</h2><div class="stats-toolbar"><div><label style="margin:0 0 .25rem">Année</label><input id="dutyStatsYear" type="number" min="2020" max="2100" style="width:8rem" onchange="renderDutyStats()"></div><button class="fr-btn secondary small" type="button" onclick="exportDutyStatsCSV()">Exporter CSV</button><button class="fr-btn secondary small" type="button" onclick="exportDutyStatsPDF()">Exporter PDF</button></div></div><div class="card-body" id="dutyStatsBody"></div></div>`;
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
  document.querySelectorAll('.settings-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.settingsTab === tab));
  document.querySelectorAll('[data-settings-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.settingsPanel === tab));
  const select = document.getElementById('settingsSectionSelect');
  if (select && select.value !== tab) select.value = tab;
}

function ensureSettingsNavigatorUI() {
  const tabs = document.querySelector('.settings-tabs');
  if (!tabs) return;
  let wrapper = document.querySelector('.settings-selector-row');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'settings-selector-row';
    wrapper.innerHTML = `<label for="settingsSectionSelect">Section des paramètres</label><select id="settingsSectionSelect"></select>`;
    tabs.parentNode.insertBefore(wrapper, tabs);
  }
  const select = wrapper.querySelector('select');
  const options = Array.from(tabs.querySelectorAll('.settings-tab')).map(btn => ({
    value: btn.dataset.settingsTab,
    label: btn.textContent.trim()
  }));
  select.innerHTML = options.map(option => `<option value="${esc(option.value)}">${esc(option.label)}</option>`).join('');
  select.onchange = () => showSettingsTab(select.value);
  tabs.hidden = true;
}

function ensureBrandingSettingsUI() {
  const generalPanel = document.querySelector('[data-settings-panel="general"] .settings-grid');
  if (!generalPanel || document.getElementById('brandingCard')) return;
  const card = document.createElement('div');
  card.className = 'card'; card.id = 'brandingCard';
  card.innerHTML = `<div class="card-header"><h2 class="card-title">Logo et favicon</h2></div>
  <div class="card-body">
    <label for="settingBrandLogo">Logo du site et des documents</label>
    <input id="settingBrandLogo" placeholder="URL, chemin local ou data URI">
    <div style="margin-top:.75rem"><label for="settingBrandLogoFile">Importer un logo</label><input id="settingBrandLogoFile" type="file" accept="image/*"></div>
    <div class="branding-preview"><img id="settingBrandLogoPreview" alt="Aperçu logo" style="display:none"></div>
    <div style="margin-top:1rem"><label for="settingFavicon">Favicon</label><input id="settingFavicon" placeholder="Laisser vide pour utiliser favicon.ico à la racine"></div>
    <div style="margin-top:.75rem"><label for="settingFaviconFile">Importer un favicon</label><input id="settingFaviconFile" type="file" accept="image/*,.ico"></div>
    <div class="branding-preview"><img id="settingFaviconPreview" alt="Aperçu favicon" style="display:none"></div>
    
    <div class="list-actions" style="margin-top:1rem"><button class="fr-btn" type="button" onclick="saveSettings()">Enregistrer les paramètres</button></div>
  </div>`;
  generalPanel.appendChild(card);

  const readFile = (file, targetInputId, targetPreviewId) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const input = document.getElementById(targetInputId);
      const preview = document.getElementById(targetPreviewId);
      if (input) input.value = reader.result;
      if (preview) { preview.src = reader.result; preview.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  };
  document.getElementById('settingBrandLogoFile').onchange = e => readFile(e.target.files[0], 'settingBrandLogo', 'settingBrandLogoPreview');
  document.getElementById('settingFaviconFile').onchange = e => readFile(e.target.files[0], 'settingFavicon', 'settingFaviconPreview');
}

function loadSettingsForm() {
  const get = id => document.getElementById(id);
  if (get('settingTheme')) get('settingTheme').value = state.settings.theme || 'light';
  if (get('settingDashboardBanner')) get('settingDashboardBanner').value = state.settings.dashboardBanner || '';
  updateDashboardBannerThumb(state.settings.dashboardBanner || '');
  if (get('settingPsFormat')) get('settingPsFormat').value = state.settings.psFormat || 'detail';
  if (get('settingClassification')) get('settingClassification').value = state.settings.classification || 'Non protégé';
  if (get('settingAuthor')) get('settingAuthor').value = state.settings.author || 'SIRACEDPC';
  if (get('settingPsSignatureMode')) get('settingPsSignatureMode').value = state.settings.psSignatureMode || 'prefet';
  if (get('settingPsSignatureName')) get('settingPsSignatureName').value = state.settings.psSignatureName || '';
  if (get('settingPsSignatureRole')) get('settingPsSignatureRole').value = state.settings.psSignatureRole || '';

  ensureBrandingSettingsUI();
  if (get('settingBrandLogo')) {
    get('settingBrandLogo').value = state.settings.brandLogo || '';
    const logoPreview = get('settingBrandLogoPreview');
    if (logoPreview) { logoPreview.src = currentLogoSrc(); logoPreview.style.display = 'block'; }
  }
  if (get('settingFavicon')) {
    get('settingFavicon').value = state.settings.favicon || '';
    const fav = currentFaviconSrc();
    const favPreview = get('settingFaviconPreview');
    if (fav && favPreview) { favPreview.src = fav; favPreview.style.display = 'block'; }
  }

  if (get('settingEventTypes')) get('settingEventTypes').value = getDynamicList('eventTypes').join('\n');
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
  if (get('settingPlanExpiryRules')) get('settingPlanExpiryRules').value = Object.entries(state.settings.planExpiryYears || {}).map(([k,v]) => `${k} = ${v}`).join('\n');

  showSettingsTab('general');
}

function saveSettings() {
  const get = id => document.getElementById(id);
  state.settings.theme = get('settingTheme')?.value || 'light';
  state.settings.dashboardBanner = (get('settingDashboardBanner')?.value || '').trim();
  state.settings.psFormat = get('settingPsFormat')?.value || 'detail';
  state.settings.classification = get('settingClassification')?.value || 'Non protégé';
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
  state.settings.brandLogo = (get('settingBrandLogo')?.value || '').trim();
  state.settings.favicon = (get('settingFavicon')?.value || '').trim();

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
  alert('Paramètres enregistrés.');
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

const settingsRuntime = {
  blueprint: null
};

function refreshStorageStatus() {
  const label = document.getElementById('storageStatusLabel');
  if (!label) return;
  label.textContent = window.SICODApi?.system?.getStorageModeLabel?.() || 'Stockage local navigateur';
}

function ensureBrandingSettingsUI() {
  const generalPanel = document.querySelector('[data-settings-panel="general"] .settings-grid');
  if (!generalPanel || document.getElementById('brandingCard')) return;
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'brandingCard';
  card.innerHTML = `<div class="card-header"><h2 class="card-title">Logo et favicon</h2></div>
  <div class="card-body">
    <label for="settingBrandLogo">Logo du site et des documents</label>
    <input id="settingBrandLogo" placeholder="URL, chemin local ou data URI">
    <div class="field-stack"><label for="settingBrandLogoFile">Importer un logo</label><input id="settingBrandLogoFile" type="file" accept="image/*"></div>
    <div class="branding-preview"><img id="settingBrandLogoPreview" alt="Aperçu logo" style="display:none"></div>
    <div class="field-stack"><label for="settingFavicon">Favicon</label><input id="settingFavicon" placeholder="Laisser vide pour utiliser assets/favicon.ico"></div>
    <div class="field-stack"><label for="settingFaviconFile">Importer un favicon</label><input id="settingFaviconFile" type="file" accept="image/*,.ico"></div>
    <div class="branding-preview"><img id="settingFaviconPreview" alt="Aperçu favicon" style="display:none"></div>
    <p class="help">Pour un hébergement statique simple, privilégier des assets dans <code>frontend/assets/</code> ou des data URI.</p>
    <div class="list-actions"><button class="fr-btn" type="button" onclick="saveSettings()">Enregistrer les paramètres</button></div>
  </div>`;
  generalPanel.appendChild(card);

  const readFile = (file, targetInputId, targetPreviewId) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const input = document.getElementById(targetInputId);
      const preview = document.getElementById(targetPreviewId);
      if (input) input.value = reader.result;
      if (preview) {
        preview.src = reader.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  };

  document.getElementById('settingBrandLogoFile').onchange = e => readFile(e.target.files[0], 'settingBrandLogo', 'settingBrandLogoPreview');
  document.getElementById('settingFaviconFile').onchange = e => readFile(e.target.files[0], 'settingFavicon', 'settingFaviconPreview');
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
  if (!pageInner || pageInner.querySelector('[data-settings-panel="exports"]')) return;
  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.dataset.settingsPanel = 'exports';
  panel.innerHTML = `<div class="settings-stack">
    <div class="card">
      <div class="card-header"><h2 class="card-title">Matrice des exports PDF</h2></div>
      <div class="card-body">
        <p class="help">Chaque modèle pilote l ordre des blocs, la variante, l orientation et les champs exploités dans les exports PDF.</p>
        <label for="settingDocumentTemplates">JSON des modèles</label>
        <textarea id="settingDocumentTemplates" class="code-area" spellcheck="false"></textarea>
        <p class="help">Pour créer un nouveau modèle, dupliquer un objet, changer <code>id</code>, <code>name</code>, <code>version</code>, <code>variant</code> et <code>layout.sections</code>, puis enregistrer.</p>
        <div class="list-actions"><button class="fr-btn" type="button" onclick="saveSettings()">Enregistrer les paramètres</button></div>
      </div>
    </div>
    <div class="settings-grid">
      <div class="card">
        <div class="card-header"><h2 class="card-title">Guide des champs PDF</h2></div>
        <div class="card-body" id="pdfTemplateGuideList"></div>
      </div>
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
      <div class="card">
        <div class="card-header"><h2 class="card-title">Chemins de référence</h2></div>
        <div class="card-body">
        <div class="info-pairs">
            <div><strong>Frontend runtime</strong><code>frontend/assets/js/modules/pdf-templates.js</code></div>
            <div><strong>Seed Supabase</strong><code>supabase/document-templates.seed.sql</code></div>
            <div><strong>Schema Supabase</strong><code>supabase/schema.sql</code></div>
            <div><strong>Guide projet</strong><code>docs/supabase-setup.md</code></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  const usersPanel = pageInner.querySelector('[data-settings-panel="users"]');
  pageInner.insertBefore(panel, usersPanel || null);
}

function ensureSystemSettingsUI() {
  const generalGrid = document.querySelector('[data-settings-panel="general"] .settings-grid');
  if (!generalGrid || document.getElementById('systemCard')) return;
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'systemCard';
  card.innerHTML = `<div class="card-header"><h2 class="card-title">Stockage et synchronisation</h2></div>
  <div class="card-body">
    <div id="systemBlueprintList" class="info-pairs">
      <div><strong>Mode actuel</strong><span>${esc(window.SICODApi?.system?.getStorageModeLabel?.() || 'Stockage local navigateur')}</span></div>
      <div><strong>Cible</strong><span>GitHub Pages ou hebergement statique + Supabase</span></div>
    </div>
    <p class="help">L application reste pleinement fonctionnelle en local et peut synchroniser son état vers Supabase sans backend applicatif dédié.</p>
  </div>`;
  generalGrid.appendChild(card);
  const cardBody = card.querySelector('.card-body');
  if (cardBody) {
    const providerGrid = document.createElement('div');
    providerGrid.className = 'grid-2';
    providerGrid.style.marginTop = '1rem';
    providerGrid.innerHTML = `
      <div><label for="settingRemoteProvider">Fournisseur distant</label><select id="settingRemoteProvider"><option value="none">Aucun</option><option value="supabase">Supabase</option></select></div>
      <div><label for="settingRemoteEnabled">Activation</label><select id="settingRemoteEnabled"><option value="0">Mode local uniquement</option><option value="1">Activer la synchronisation distante</option></select></div>
      <div><label for="settingSupabaseUrl">URL Supabase</label><input id="settingSupabaseUrl" placeholder="https://xxxxx.supabase.co"></div>
      <div><label for="settingSupabaseProjectRef">Project ref</label><input id="settingSupabaseProjectRef" placeholder="xxxxx"></div>
      <div class="full"><label for="settingSupabaseAnonKey">Clé publique Supabase</label><textarea id="settingSupabaseAnonKey" style="min-height:8rem" spellcheck="false" placeholder="sb_publishable_xxx ou clé anon"></textarea></div>
    `;
    const actions = document.createElement('div');
    actions.className = 'cloud-admin-grid';
    actions.innerHTML = `
      <button class="fr-btn secondary" type="button" onclick="checkCloudflareState()">Tester Supabase</button>
      <button class="fr-btn secondary" type="button" onclick="exportCurrentStateJson()">Exporter les données</button>
      <button class="fr-btn secondary" type="button" onclick="pushCurrentStateToCloudflare()">Pousser l'état courant</button>
      <button class="fr-btn secondary" type="button" onclick="reloadStateFromCloudflare()">Recharger depuis Supabase</button>
    `;
    const importWrap = document.createElement('div');
    importWrap.className = 'field-stack';
    importWrap.innerHTML = `
      <label for="cloudStateImportFile">Importer un export JSON dans Supabase</label>
      <input id="cloudStateImportFile" type="file" accept="application/json,.json">
    `;
    const status = document.createElement('div');
    status.id = 'cloudStateStatus';
    status.className = 'cloud-status-panel help';
    status.textContent = 'Aucun contrôle exécuté pour le moment.';
    cardBody.appendChild(providerGrid);
    cardBody.appendChild(actions);
    cardBody.appendChild(importWrap);
    cardBody.appendChild(status);
  }
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
  updateCloudStateStatus('Export JSON généré depuis l’état courant du navigateur.', 'success');
}

async function checkCloudflareState() {
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
    updateCloudStateStatus(`
      <strong>Supabase joignable.</strong><br>
      Mode : ${esc(window.SICODApi.system.getStorageModeLabel())}<br>
      Modèles PDF : ${remoteTemplates.length}<br>
      Événements : ${counts.events} · PS : ${counts.ps} · Messages : ${counts.commandMessages} · Contacts : ${counts.contacts}
    `, 'success');
    refreshStorageStatus();
    hydrateSystemBlueprint();
    return remoteStatePayload;
  } catch (error) {
    updateCloudStateStatus(`Contrôle Supabase impossible : ${esc(error.message || String(error))}`, 'warning');
    refreshStorageStatus();
    throw error;
  }
}

async function pushCurrentStateToCloudflare() {
  updateCloudStateStatus('Envoi de l’état courant vers Supabase...', 'info');
  try {
    ensureStateIntegrity();
    await window.SICODApi.system.pushRemoteState(state);
    const counts = countStateRecords(state);
    updateCloudStateStatus(`
      <strong>Synchronisation terminée.</strong><br>
      Événements : ${counts.events} · PS : ${counts.ps} · Messages : ${counts.commandMessages} · Contacts : ${counts.contacts}
    `, 'success');
    refreshStorageStatus();
    hydrateSystemBlueprint();
  } catch (error) {
    updateCloudStateStatus(`Synchronisation Supabase impossible : ${esc(error.message || String(error))}`, 'warning');
    refreshStorageStatus();
  }
}

async function reloadStateFromCloudflare() {
  updateCloudStateStatus('Chargement de l’état Supabase en cours...', 'info');
  try {
    const payload = await window.SICODApi.system.getRemoteState();
    if (!payload?.state || typeof payload.state !== 'object') {
      updateCloudStateStatus('Supabase est joignable, mais aucun état n’est encore enregistré.', 'warning');
      refreshStorageStatus();
      return;
    }
    const fresh = Object.assign(buildDefaultState(), payload.state);
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, fresh);
    ensureStateIntegrity();
    applyTheme(state.settings.theme);
    renderAll();
    refreshStorageStatus();
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
      await window.SICODApi.system.pushRemoteState(parsed);
      const fresh = Object.assign(buildDefaultState(), parsed);
      Object.keys(state).forEach((key) => delete state[key]);
      Object.assign(state, fresh);
      ensureStateIntegrity();
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

function renderPdfTemplateGuide() {
  const mount = document.getElementById('pdfTemplateGuideList');
  if (!mount) return;
  const guide = window.SICODSettings?.getTemplateFieldGuide?.() || [];
  mount.innerHTML = guide.length
    ? `<div class="info-pairs">${guide.map(item => `<div><strong>${esc(item.field)}</strong><span>${esc(item.label)} · ${esc(item.use)}</span></div>`).join('')}</div>`
    : '<p class="help">Guide indisponible.</p>';
}

function ensureHostingInfoUI() {
  const panel = document.querySelector('[data-settings-panel="users"] .card');
  if (!panel) return;
  const title = panel.querySelector('.card-title');
  if (title) title.textContent = 'Accès et hébergement';
  const body = panel.querySelector('.card-body');
  if (!body) return;
  body.innerHTML = `
    <p class="help">Ce projet vise désormais un frontend statique publié sur GitHub Pages ou un autre hébergement simple, avec une synchronisation des données vers Supabase.</p>
    <table class="table">
      <thead><tr><th>Sujet</th><th>Référence</th><th>Usage</th></tr></thead>
      <tbody>
        <tr><td>Publication statique</td><td><code>docs/github-pages-supabase.md</code></td><td>Déploiement GitHub Pages</td></tr>
        <tr><td>Base partagée</td><td><code>docs/supabase-setup.md</code></td><td>Configuration Supabase</td></tr>
        <tr><td>Schéma SQL</td><td><code>supabase/schema.sql</code></td><td>Initialisation de la base</td></tr>
      </tbody>
    </table>
  `;
}

async function hydrateSystemBlueprint() {
  const mount = document.getElementById('systemBlueprintList');
  if (!mount) return;
  try {
    settingsRuntime.blueprint = settingsRuntime.blueprint || await window.SICODApi.system.getBlueprint();
  } catch (error) {
    console.warn('[Settings] Blueprint indisponible :', error.message);
  }
  const blueprint = settingsRuntime.blueprint;
  if (!blueprint) return;
  mount.innerHTML = `
    <div><strong>Mode actuel</strong><span>${esc(window.SICODApi?.system?.getStorageModeLabel?.() || 'Stockage local navigateur')}</span></div>
    <div><strong>Frontend cible</strong><span>${esc(blueprint.targetPlatform?.frontend || 'GitHub Pages ou hébergement statique')}</span></div>
    <div><strong>Base cible</strong><span>${esc(blueprint.targetPlatform?.database || 'Supabase PostgreSQL')}</span></div>
    <div><strong>Authentification</strong><span>${esc(blueprint.targetPlatform?.auth || 'Supabase Auth')}</span></div>
    <div><strong>Objets / médias</strong><span>${esc(blueprint.targetPlatform?.objectStorage || 'Supabase Storage')}</span></div>
    <div><strong>Entrée frontend</strong><code>${esc(blueprint.frontend?.entrypoint || '/index.html')}</code></div>
  `;
}

function ensureSettingsEnhancements() {
  ensureExportSettingsUI();
  ensureSettingsNavigatorUI();
  ensureBrandingSettingsUI();
  ensureSystemSettingsUI();
  ensureHostingInfoUI();
  renderPdfTemplateGuide();
  hydrateSystemBlueprint();
  bindCloudStateImport();
}

function loadSettingsForm() {
  const get = id => document.getElementById(id);
  const activeTab = document.querySelector('.settings-tab.active')?.dataset.settingsTab || 'general';
  ensureSettingsEnhancements();
  if (get('settingTheme')) get('settingTheme').value = state.settings.theme || 'light';
  if (get('settingDashboardBanner')) get('settingDashboardBanner').value = state.settings.dashboardBanner || '';
  updateDashboardBannerThumb(state.settings.dashboardBanner || '');
  if (get('settingPsFormat')) get('settingPsFormat').value = state.settings.psFormat || 'detail';
  if (get('settingClassification')) get('settingClassification').value = state.settings.classification || 'Non protégé';
  if (get('settingAuthor')) get('settingAuthor').value = state.settings.author || 'SIRACEDPC';
  if (get('settingPsSignatureMode')) get('settingPsSignatureMode').value = state.settings.psSignatureMode || 'prefet';
  if (get('settingPsSignatureName')) get('settingPsSignatureName').value = state.settings.psSignatureName || '';
  if (get('settingPsSignatureRole')) get('settingPsSignatureRole').value = state.settings.psSignatureRole || '';
  if (get('settingBrandLogo')) {
    get('settingBrandLogo').value = state.settings.brandLogo || '';
    const logoPreview = get('settingBrandLogoPreview');
    if (logoPreview) {
      logoPreview.src = currentLogoSrc();
      logoPreview.style.display = 'block';
    }
  }
  if (get('settingFavicon')) {
    get('settingFavicon').value = state.settings.favicon || '';
    const favPreview = get('settingFaviconPreview');
    if (favPreview) {
      favPreview.src = currentFaviconSrc();
      favPreview.style.display = 'block';
    }
  }
  if (get('settingEventTypes')) get('settingEventTypes').value = getDynamicList('eventTypes').join('\n');
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
  if (get('settingDocumentTemplates')) get('settingDocumentTemplates').value = JSON.stringify(window.SICODPdfTemplates?.listTemplates(state) || [], null, 2);
  if (get('settingPdfPrimaryColor')) get('settingPdfPrimaryColor').value = state.settings.pdfAppearance?.primaryColor || DEFAULT_SETTINGS.pdfAppearance.primaryColor;
  if (get('settingPdfAccentColor')) get('settingPdfAccentColor').value = state.settings.pdfAppearance?.accentColor || DEFAULT_SETTINGS.pdfAppearance.accentColor;
  if (get('settingPdfTextColor')) get('settingPdfTextColor').value = state.settings.pdfAppearance?.textColor || DEFAULT_SETTINGS.pdfAppearance.textColor;
  if (get('settingPdfAlertColor')) get('settingPdfAlertColor').value = state.settings.pdfAppearance?.alertColor || DEFAULT_SETTINGS.pdfAppearance.alertColor;
  if (get('settingPdfLogoScale')) get('settingPdfLogoScale').value = String(state.settings.pdfAppearance?.logoScale || DEFAULT_SETTINGS.pdfAppearance.logoScale);
  if (get('settingRemoteProvider')) get('settingRemoteProvider').value = state.settings.remoteSync?.provider || 'none';
  if (get('settingRemoteEnabled')) get('settingRemoteEnabled').value = state.settings.remoteSync?.enabled ? '1' : '0';
  if (get('settingSupabaseUrl')) get('settingSupabaseUrl').value = state.settings.remoteSync?.supabaseUrl || '';
  if (get('settingSupabaseProjectRef')) get('settingSupabaseProjectRef').value = state.settings.remoteSync?.projectRef || '';
  if (get('settingSupabaseAnonKey')) get('settingSupabaseAnonKey').value = state.settings.remoteSync?.supabaseAnonKey || '';
  showSettingsTab(activeTab);
  refreshStorageStatus();
}

function saveSettings() {
  const get = id => document.getElementById(id);
  if (get('settingDocumentTemplates')) {
    try {
      const parsedTemplates = JSON.parse(get('settingDocumentTemplates').value || '[]');
      window.SICODPdfTemplates?.setTemplates(state, parsedTemplates);
    } catch (error) {
      showSettingsTab('exports');
      alert(`Le JSON des modèles PDF est invalide : ${error.message}`);
      return;
    }
  }
  state.settings.theme = get('settingTheme')?.value || 'light';
  state.settings.dashboardBanner = (get('settingDashboardBanner')?.value || '').trim();
  state.settings.psFormat = get('settingPsFormat')?.value || 'detail';
  state.settings.classification = get('settingClassification')?.value || 'Non protégé';
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
  state.settings.brandLogo = (get('settingBrandLogo')?.value || '').trim();
  state.settings.favicon = (get('settingFavicon')?.value || '').trim();
  state.settings.pdfAppearance = {
    primaryColor: get('settingPdfPrimaryColor')?.value || DEFAULT_SETTINGS.pdfAppearance.primaryColor,
    accentColor: get('settingPdfAccentColor')?.value || DEFAULT_SETTINGS.pdfAppearance.accentColor,
    textColor: get('settingPdfTextColor')?.value || DEFAULT_SETTINGS.pdfAppearance.textColor,
    alertColor: get('settingPdfAlertColor')?.value || DEFAULT_SETTINGS.pdfAppearance.alertColor,
    logoScale: Number(get('settingPdfLogoScale')?.value || DEFAULT_SETTINGS.pdfAppearance.logoScale)
  };
  state.settings.remoteSync = {
    provider: get('settingRemoteProvider')?.value === 'supabase' ? 'supabase' : 'none',
    enabled: get('settingRemoteEnabled')?.value === '1' && get('settingRemoteProvider')?.value === 'supabase',
    supabaseUrl: (get('settingSupabaseUrl')?.value || '').trim(),
    supabaseAnonKey: (get('settingSupabaseAnonKey')?.value || '').trim(),
    projectRef: (get('settingSupabaseProjectRef')?.value || '').trim()
  };
  window.SICODApi?.system?.setRemoteConfig?.(state.settings.remoteSync);

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
  alert('Paramètres enregistrés.');
}

// ────────────────────────────────────────────────────────────────────────────
// 19. BOOTSTRAP — Initialisation, renderAll, intervalles
// ────────────────────────────────────────────────────────────────────────────

function renderAll() {
  renderEvents();
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
}

// Initialisation
applyTheme(state.settings.theme);

const dutyMonthEl = document.getElementById('dutyMonth');
if (dutyMonthEl && !dutyMonthEl.value) dutyMonthEl.value = todayISO().slice(0, 7);

initCommandForm();
renderAll();
window.SICODApi?.system?.hydrateState?.()
  .then((remoteState) => {
    if (!remoteState || typeof remoteState !== 'object') {
      refreshStorageStatus();
      persist();
      return;
    }
    const fresh = Object.assign(buildDefaultState(), remoteState);
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, fresh);
    ensureStateIntegrity();
    applyTheme(state.settings.theme);
    renderAll();
    refreshStorageStatus();
  })
  .catch((error) => {
    console.warn('[Remote] Hydratation distante indisponible :', error.message);
    refreshStorageStatus();
  });

// Mise à jour dashboard chaque seconde (heure locale)
setInterval(renderDashboard, 1000);


function formatDateFR(value){if(!value)return '';const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return `${m[3]}/${m[2]}/${m[1]}`;const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;}

function editSelectedPS(){
 if(!state.selectedPSId){alert('Sélectionnez un point de situation');return;}
 openPSForm(state.selectedPSId);
}
function deleteSelectedPS(){
 if(!state.selectedPSId){alert('Sélectionnez un point de situation');return;}
 deletePS(state.selectedPSId);
}


function exportPSFocusViaPrint(ps){ return exportPSFocusPDF(ps); }
