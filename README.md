# SSH Host Colors

Colore l'interface de VS Code selon le serveur SSH auquel tu es connecté via **Remote - SSH**, pour ne plus jamais confondre la prod et la dev.

![Gestionnaire avec aperçu](images/screenshot-manager.png)

## Fonctionnalités

- **Gestionnaire graphique** (`SSH Host Colors: Ouvrir le gestionnaire`) :
  - liste de tous tes hosts, et ajout en un clic de ceux de ton `~/.ssh/config`
  - sélecteur de couleur, 12 couleurs proposées, couleur aléatoire
  - **aperçu en direct** dans une fausse fenêtre VS Code (fenêtre active ou inactive)
  - libellé personnalisé (ex. « PROD ⚠ ») affiché dans la barre d'état
  - zones par défaut, ou propres à chaque host
- **9 zones colorables** : barre de titre, centre de commandes, barre d'activité, barre d'état, indicateur distant, onglet actif, bordure latérale, bordure du panneau, bordure de fenêtre.
- **Aperçu sur la vraie fenêtre** : dans `Choisir la couleur` / `Choisir les zones`, survoler une couleur ou cocher une zone l'applique tout de suite. Échap annule.
- **Motifs** : `prod-*` colore tous les hosts qui commencent par `prod-`. Un nom exact passe avant un motif.
- **Tout supprimer** en un clic, plus une commande pour activer / désactiver toutes les couleurs.
- Pastille dans la barre d'état : un clic ouvre le menu rapide.

![Zones personnalisées et aperçu de fenêtre inactive](images/screenshot-zones.png)

## Commandes

| Commande | Rôle |
|---|---|
| Ouvrir le gestionnaire | Interface complète avec aperçu |
| Choisir la couleur (aperçu en direct) | Quick pick avec prévisualisation sur la fenêtre |
| Choisir les zones colorées | Pour ce host ou par défaut |
| Activer / désactiver les couleurs | Interrupteur global |
| Supprimer la couleur d'un host | |
| Tout supprimer | Efface tous les hosts et retire les couleurs |
| Nettoyer les couleurs de ce workspace | Retire les couleurs restées bloquées |

## Démarrage rapide

1. Connecte-toi à un serveur avec **Remote - SSH** et ouvre un dossier.
2. Clique sur la pastille en bas à gauche → **Changer la couleur**.
3. Survole les couleurs pour les essayer, puis Entrée.

## Configuration manuelle

```json
"sshHostColors.hosts": {
  "prod-*": "#c0392b",
  "dev-server": { "color": "#27ae60", "label": "DEV", "elements": ["statusBar", "activeTab"] }
},
"sshHostColors.elements": ["titleBar", "activityBar", "statusBar"]
```

## Notes

- Les couleurs sont écrites dans `workbench.colorCustomizations` **au niveau du workspace** (`.vscode/settings.json` sur le serveur), pour ne colorer que la fenêtre connectée. Tes propres personnalisations sont conservées : seules les valeurs posées par l'extension sont retirées.
- Après « Tout supprimer », les fenêtres ouvertes sont nettoyées tout de suite, les autres à leur prochaine ouverture.
- Sans dossier ouvert, VS Code ne permet pas de colorer la fenêtre : seule la pastille s'affiche.
- La barre de titre et la bordure de fenêtre demandent `"window.titleBarStyle": "custom"` (c'est le réglage par défaut sous Windows).
