# 未解檔案｜Unresolved Files

> 說謊者，不一定就是兇手。

《未解檔案》是一款以 **Flask** 製作的網頁互動推理遊戲。目前收錄 CASE 001〈牆後的第三聲〉，玩家將前往藤原山莊調查七年前的死亡事件，透過現場蒐證、人物訊問、證據關聯與推理分析，逐步重建真相。

## 遊戲特色

- **現場調查**：切換調查地點，點擊場景物件尋找線索。
- **人物訊問**：固定話題、證詞反駁與 Gemini API 自由問答。
- **偵探手札**：可拖曳的復古書本介面，查閱筆記與已取得證物的詳細資料。
- **推理分析**：顯示解鎖條件及證據需求，完成推理後進入結案流程。
- **案件收藏冊**：通關後解鎖可翻閱的劇情與人物小傳。

## 使用技術

Python、Flask、HTML、CSS、JavaScript、Google Gemini API。遊戲進度儲存於瀏覽器 `localStorage`。

## 本機執行

建議使用 Python 3.10 以上版本。

```bash
python -m venv .venv
```

啟用虛擬環境：Windows 執行 `.venv\Scripts\activate`；macOS / Linux 執行 `source .venv/bin/activate`。

```bash
pip install -r requirements.txt
```

將 `.env.example` 複製為 `.env`，並填入你的 Gemini API Key：

```dotenv
GEMINI_API_KEY=你的金鑰
GEMINI_MODEL=gemini-2.5-flash
```

接著執行：

```bash
python app.py
```

在瀏覽器開啟 `http://127.0.0.1:5000/`。

**注意：** Gemini 自由問答需要有效的 API Key 與網路連線；沒有 API Key 時，固定話題與主要推理流程仍可使用。

## 頁面

| 路徑 | 用途 |
| --- | --- |
| `/` | 遊戲首頁 |
| `/cases/fujiwara` | 案件介紹 |
| `/cases/fujiwara/play` | 調查遊戲 |
| `/cases/fujiwara/archive` | 通關後案件收藏冊 |

## 專案結構

```text
app.py                 Flask 後端與 API
requirements.txt       Python 套件
.env.example           API 設定範本
Procfile / railway.json 部署設定
templates/             HTML 頁面
static/css/            網頁樣式
static/js/             遊戲邏輯與互動
static/art/            場景與人物素材
```

## 安全與限制

- **不要將 `.env` 或 Gemini API Key 上傳到 GitHub。** `.gitignore` 已排除 `.env`。
- Gemini 自由問答為輔助互動，關鍵推理及通關條件仍由遊戲規則控制。
- 存檔保存在本機瀏覽器，清除網站資料或更換裝置可能遺失進度。
- 本專案目前以單案件版本為主；人物素材及其他素材的公開使用權，請在發布前逐一確認。

## 版本

**V42** — 恢復首頁、增加通關收藏冊、修正收藏冊返回首頁的導覽樣式，並保留前版人物訊問、手札與推理功能。
