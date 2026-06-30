---
title: "AWS Amplify 빌드 알림 → Slack 연동하기"
date: "2026-06-29"
category: "AWS"
tags: ["aws", "amplify", "lambda", "eventbridge", "slack", "devops"]
description: "AWS Amplify 빌드 이벤트를 EventBridge와 Lambda를 활용해 Slack으로 자동 전송하는 방법을 정리합니다."
---

## 왜 만들었냐면

Amplify로 배포하다 보면 빌드가 언제 끝났는지 콘솔을 직접 들어가서 확인해야 해서 좀 불편했다.

Amplify 콘솔에 기본 알림 기능이 있긴 한데 이메일만 지원한다. AWS Chatbot으로 Slack 연동하는 방법도 있는데 메시지 포맷을 커스텀할 수가 없어서 맘에 안 들었다.

그래서 그냥 **EventBridge → Lambda → Slack Webhook** 구조로 직접 만들기로 했다.

## 아키텍처

```
AWS Amplify → EventBridge → Lambda → Slack Webhook
```

Amplify에서 빌드 이벤트가 발생하면 자동으로 EventBridge에 이벤트가 올라간다. EventBridge 규칙이 이걸 감지해서 Lambda를 실행하고, Lambda에서 Slack Block Kit으로 꾸민 메시지를 보내는 흐름이다.

---

## 사전 준비

작업하는 IAM 유저에 아래 권한이 없으면 중간에 막힌다. 없으면 관리자한테 미리 받아두자.

**Lambda**

- `lambda:CreateFunction`
- `lambda:UpdateFunctionCode`
- `lambda:UpdateFunctionConfiguration`
- `lambda:InvokeFunction`

**EventBridge**

- `events:ListRules`
- `events:PutRule`
- `events:PutTargets`
- `events:DescribeRule`

---

## Step 1. Slack Incoming Webhook 생성

먼저 Slack에서 메시지를 받을 Webhook URL을 발급받아야 한다.

1. [api.slack.com/apps](https://api.slack.com/apps) 접속
2. **Create New App** → **From scratch**
3. **Incoming Webhooks** 메뉴에서 토글 ON
4. **Add New Webhook to Workspace** → 알림 받을 채널 선택
5. 생성된 Webhook URL 복사

> Webhook URL은 절대 코드에 하드코딩하지 말고 Lambda 환경 변수에만 넣자.

---

## Step 2. Lambda 함수 생성

### 함수 설정

- 런타임: `Python 3.12`
- 아키텍처: `x86_64`

### 코드

```python
import json
import urllib.request
import os
from datetime import datetime, timezone, timedelta

SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
KST = timezone(timedelta(hours=9))

STATUS_CONFIG = {
    "SUCCEED": {"emoji": "✅", "color": "#2eb886", "label": "Build Succeeded"},
    "FAILED":  {"emoji": "🚨", "color": "#e01e5a", "label": "Build Failed"},
    "STARTED": {"emoji": "🔨", "color": "#f0a500", "label": "Build Started"},
}

APP_NAMES = json.loads(os.environ.get("APP_NAMES", "{}"))

def get_app_name(app_id: str) -> str:
    return APP_NAMES.get(app_id, app_id)

def now_kst() -> str:
    return datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")

def build_blocks(detail: dict) -> tuple[list, str]:
    app_id   = detail.get("appId", "unknown")
    app_name = get_app_name(app_id)
    branch   = detail.get("branchName", "unknown")
    status   = detail.get("jobStatus", "UNKNOWN")
    build_no = detail.get("jobId", "-")

    cfg   = STATUS_CONFIG.get(status, {"emoji": "ℹ️", "color": "#808080", "label": status})
    emoji = cfg["emoji"]
    color = cfg["color"]
    label = cfg["label"]

    console_url = (
        f"https://{AWS_REGION}.console.aws.amazon.com"
        f"/amplify/home#{app_id}/{branch}/{build_no}"
    )

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{emoji}  {app_name} · {branch} · {label}",
                "emoji": True,
            },
        },
        {"type": "divider"},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*App*\n`{app_name}`"},
                {"type": "mrkdwn", "text": f"*Branch*\n`{branch}`"},
                {"type": "mrkdwn", "text": f"*Build No.*\n`#{build_no}`"},
                {"type": "mrkdwn", "text": f"*Status*\n{emoji}  {label}"},
            ],
        },
        {"type": "divider"},
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Open Console", "emoji": True},
                    "url": console_url,
                    "style": "primary",
                }
            ],
        },
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"{now_kst()}"}],
        },
    ]
    return blocks, color

def send_to_slack(blocks: list, color: str) -> None:
    if not SLACK_WEBHOOK_URL:
        raise ValueError("SLACK_WEBHOOK_URL environment variable is not set.")
    payload = {
        "attachments": [{"color": color, "blocks": blocks, "fallback": "Amplify Build Notification"}]
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        SLACK_WEBHOOK_URL, data=data,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        body = resp.read().decode()
        if resp.status != 200 or body != "ok":
            raise RuntimeError(f"Slack error: status={resp.status}, body={body}")

def lambda_handler(event, context):
    detail = event.get("detail", {})
    blocks, color = build_blocks(detail)
    send_to_slack(blocks, color)
    return {"statusCode": 200, "body": "ok"}
```

### 환경 변수 설정

Lambda → 구성 → 환경 변수에 아래 두 가지를 추가하면 된다.

| 키                  | 값                                                |
| ------------------- | ------------------------------------------------- |
| `SLACK_WEBHOOK_URL` | Step 1에서 발급한 Webhook URL                     |
| `APP_NAMES`         | appId → 앱이름 매핑 JSON (`{"appId1": "my-app"}`) |

`APP_NAMES`는 Amplify에서 오는 이벤트에 appId만 있고 앱 이름이 없어서 직접 매핑해줘야 한다. 안 넣으면 appId가 그대로 메시지에 찍힌다.

처음엔 boto3로 `amplify.get_app(appId=app_id)`를 호출해서 이름을 가져오려고 했는데, 그러면 Lambda 실행 역할에 `amplify:GetApp` 권한을 따로 추가해야 한다. IAM 권한 추가하는 게 귀찮기도 하고 과하다 싶어서 그냥 환경 변수로 하드코딩하는 방식을 선택했다. 앱이 수십 개씩 늘어나는 상황이 아니면 이게 더 단순하고 관리도 편하다.

appId는 Amplify 콘솔 → 해당 앱 → 앱 설정에서 확인할 수 있다.

---

## Step 3. EventBridge 규칙 생성

1. AWS 콘솔 → **Amazon EventBridge** → 규칙 → 규칙 생성
2. 이름 적당히 입력, 이벤트 버스는 `default`
3. **사용자 지정 패턴(JSON 편집기)** 선택 후 아래 패턴 입력

```json
{
  "source": ["aws.amplify"],
  "detail-type": ["Amplify Deployment Status Change"],
  "detail": {
    "appId": ["appId1", "appId2"]
  }
}
```

`appId` 배열에 알림 받고 싶은 앱만 넣으면 된다. 여러 개도 가능하다.

4. 대상: **Lambda 함수** → Step 2에서 만든 함수 선택
5. 규칙 생성

---

## Step 4. 테스트

바로 Amplify 빌드를 돌려도 되지만, Lambda 테스트 탭에서 먼저 확인해보는 게 편하다.

```json
{
  "detail": {
    "appId": "여기에appId",
    "branchName": "main",
    "jobId": "1",
    "jobStatus": "SUCCEED"
  }
}
```

`jobStatus`를 `FAILED`, `STARTED`로 바꿔가며 각 상태 메시지도 확인해보자.

---

## 트러블슈팅

실제로 삽질했던 것들 정리해둔다.

**테스트 결과가 "Hello from Lambda!" 로 나오는 경우**

코드 붙여넣고 **Deploy 버튼을 안 누른 것**이다. Lambda는 Deploy를 눌러야 실제로 반영된다. 나도 이거 때문에 한참 헤맸다.

**테스트 성공인데 Slack 메시지가 안 오는 경우**

`SLACK_WEBHOOK_URL` 환경 변수를 확인하자. curl로 Webhook URL이 살아있는지 먼저 확인해보면 빠르다.

```bash
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"test"}' \
https://hooks.slack.com/services/xxx/yyy/zzz
```

`ok` 응답이 오면 URL 자체는 문제없는 거다.

**앱 이름 대신 appId가 찍히는 경우**

`APP_NAMES` 환경 변수를 빠뜨렸거나 JSON 형식이 잘못된 것이다. `{"appId": "앱이름"}` 형식인지 체크해보자.

**EventBridge 규칙 생성할 때 권한 오류**

`events:ListRules`, `events:PutRule`, `events:PutTargets`, `events:DescribeRule` 권한이 없는 것이다. IAM 관리자한테 요청해야 한다.

**실제 빌드 이벤트가 Lambda로 안 오는 경우**

EventBridge 규칙의 `appId` 배열에 해당 앱 ID가 빠진 경우다. Amplify 콘솔에서 appId 다시 확인해보자.
