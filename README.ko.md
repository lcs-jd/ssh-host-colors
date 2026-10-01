# Host Colors — SSH, WSL, Containers & Folders

[English](README.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Italiano](README.it.md) · [Português (Brasil)](README.pt-br.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · **한국어** · [简体中文](README.zh-cn.md) · [繁體中文](README.zh-tw.md)

작업 위치에 따라 VS Code 창에 색을 입힙니다: SSH 서버, WSL 배포판, Dev Container, Codespace, Remote Tunnel 또는 프로젝트 폴더. 프로덕션과 개발 환경, 또는 프로젝트끼리 다시는 혼동하지 않습니다.

![미리 보기가 있는 관리자](images/screenshot-manager.png)

## 기능

- **그래픽 관리자** (`Host Colors: 관리자 열기`):
  - 모든 호스트 목록과 `~/.ssh/config`에 있는 호스트를 클릭 한 번으로 추가
  - 색 선택기, 추천 색 12가지, 임의의 색
  - VS Code를 본뜬 창에서 **실시간 미리 보기**(활성 또는 비활성 창)
  - 상태 표시줄에 표시되는 사용자 지정 레이블(예: "PROD ⚠")
  - 기본 영역 또는 호스트별 영역
- **색을 입힐 수 있는 9개 영역**: 제목 표시줄, 명령 센터, 작업 막대, 상태 표시줄, 원격 표시기, 활성 탭, 사이드바 테두리, 패널 테두리, 창 테두리.
- **실제 창에서 미리 보기**: `색 선택` / `색을 입힐 영역 선택`에서 색 위에 마우스를 올리거나 영역을 선택하면 바로 적용됩니다. Esc를 누르면 취소됩니다.
- **패턴**: `prod-*`는 `prod-`로 시작하는 모든 호스트에 색을 입힙니다. 정확한 이름이 패턴보다 우선합니다.
- 클릭 한 번으로 **모두 제거**, 그리고 모든 색을 사용 / 사용 안 함으로 전환하는 명령.
- 상태 표시줄의 점: 클릭하면 빠른 메뉴가 열립니다.

![사용자 지정 영역과 비활성 창 미리 보기](images/screenshot-zones.png)

## 명령

| 명령 | 용도 |
|---|---|
| 관리자 열기 | 미리 보기가 포함된 전체 인터페이스 |
| 색 선택(실시간 미리 보기) | 창에서 미리 볼 수 있는 빠른 선택 |
| 색을 입힐 영역 선택 | 이 호스트용 또는 기본값 |
| 색 사용 / 사용 안 함 | 전체 스위치 |
| 호스트 색 제거 | |
| 모두 제거 | 모든 호스트를 삭제하고 색을 제거합니다 |
| 이 작업 영역의 색 정리 | 남아 있는 색을 제거합니다 |
| 구성 내보내기… / 구성 가져오기… | 색 설정을 JSON 파일로 공유(가져올 때 병합 또는 바꾸기) |

## SSH 그 이상: WSL, 컨테이너, 프로젝트 폴더

색은 다른 창에서도 작동합니다. 항목의 키가 적용 대상을 결정합니다:

| 키 | 창 |
|---|---|
| `prod-server` | SSH 호스트(`~/.ssh/config`와 동일) |
| `wsl:Ubuntu` | WSL 배포판 |
| `container:my-app` | Dev Container(폴더 또는 컨테이너 이름) |
| `codespace:<이름>` / `tunnel:<이름>` | GitHub Codespaces / Remote Tunnel |
| `folder:c:/projects/shop` | 로컬 프로젝트 폴더 |
| `folder:prod-server:/srv/app` | 원격 환경의 폴더 |

- 폴더 항목이 해당 환경의 항목보다 우선합니다. 서버 전체에 색을 입힌 다음 프로젝트 하나에만 고유한 색을 지정할 수 있습니다(메뉴 → **이 폴더에만 색 입히기**).
- 로컬 창에서는 색이 지정된 폴더에서만 상태 표시줄에 점이 표시됩니다.
- 와일드카드는 같은 유형에만 적용됩니다: `*`는 SSH 호스트에만, `folder:*/api`는 이름이 `api`인 모든 폴더에 일치합니다.

## 언어

UI는 VS Code 표시 언어를 따릅니다: 영어(기본값), 프랑스어, 독일어, 스페인어, 이탈리아어, 포르투갈어(브라질), 러시아어, 일본어, 한국어, 중국어 간체 및 번체.

## 빠른 시작

1. 로컬 또는 원격(SSH, WSL, Dev Container, Codespace…)에서 폴더를 엽니다.
2. 원격 창: 왼쪽 아래의 점을 클릭 → **색 변경**. 로컬 창: 명령 팔레트에서 **Host Colors: 색 선택(실시간 미리 보기)**을(를) 실행합니다(폴더에 색이 지정되면 점이 표시됩니다).
3. 색 위에 마우스를 올려 시험해 본 다음 Enter 키를 누릅니다.

## 수동 구성

```json
"sshHostColors.hosts": {
  "prod-*": "#c0392b",
  "dev-server": { "color": "#27ae60", "label": "DEV", "elements": ["statusBar", "activeTab"] }
},
"sshHostColors.elements": ["titleBar", "activityBar", "statusBar"]
```

## 참고

- 연결된 창에만 색을 입히기 위해 색은 **작업 영역 수준**의 `workbench.colorCustomizations`(서버의 `.vscode/settings.json`)에 기록됩니다. 사용자 고유의 사용자 지정은 유지되며, 확장이 설정한 값만 제거됩니다.
- "모두 제거" 후 열려 있는 창은 즉시, 나머지 창은 다음에 열 때 정리됩니다.
- 폴더가 열려 있지 않으면 VS Code에서 창에 색을 입힐 수 없으며, 상태 표시줄의 점만 표시됩니다.
- 제목 표시줄과 창 테두리에는 `"window.titleBarStyle": "custom"`이 필요합니다(Windows의 기본값).
