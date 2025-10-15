<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 執行與部署您的 AI Studio 應用程式

本文件包含在本地執行應用程式並將其部署到 Vercel 所需的一切。

在 AI Studio 中檢視您的應用程式：https://ai.studio/apps/drive/11hG-FyBHouAtGWHRD1kODHngklQOHBJq

## 在本地執行

**先決條件：** Node.js

1.  安裝依賴套件：
    `npm install`
2.  在專案根目錄中，建立一個名為 `.env.local` 的檔案。
3.  將您的 Gemini API 金鑰新增到 `.env.local` 檔案中，格式如下：
    `GEMINI_API_KEY=請在此貼上您的API金鑰`
4.  執行應用程式：
    `npm run dev`

## 部署到 Vercel

您在 Vercel 上遇到「API_KEY is not configured」的錯誤，通常是因為沒有在 Vercel 專案中設定環境變數。請依照以下步驟操作即可解決問題：

1.  將您的程式碼推送到 GitHub、GitLab 或 Bitbucket 儲存庫。
2.  將該儲存庫匯入到 Vercel。
3.  在您的 Vercel 專案儀表板中，前往 **Settings > Environment Variables** (設定 > 環境變數)。
4.  新增一個環境變數，**名稱** 必須設定為 `GEMINI_API_KEY`，並將其 **值** 設定為您的 Gemini API 金鑰。
5.  從 Vercel 儀表板觸發一次新的部署。Vercel 將會使用新的環境變數來建置並部署您的應用程式。完成後，您的應用程式應該就能正常運作了。
