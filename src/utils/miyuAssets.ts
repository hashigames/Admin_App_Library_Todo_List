/**
 * MIYU Character Assets, Poses & Mouse Guide Tooltip Definitions
 */

export type MiyuPose =
  | 'idle'
  | 'talking'
  | 'happy_rawr'
  | 'welcome'
  | 'empowered'
  | 'excited_jump'
  | 'waving'
  | 'thinking'
  | 'explain';

export const MIYU_IMAGES: Record<MiyuPose, string> = {
  idle: '/assets/aistudio/Screenshot_2026-05-02_122413_49603d8d.jpg',
  waving: '/assets/aistudio/Screenshot_2026-05-02_122428_66464e68.jpg',
  talking: '/assets/aistudio/Screenshot_2026-05-02_122319_3acf7e5e.jpg',
  happy_rawr: '/assets/aistudio/Screenshot_2026-05-02_122257_a19c4032.jpg',
  thinking: '/assets/aistudio/Screenshot_2026-05-02_122338_df42f983.jpg',
  welcome: '/assets/aistudio/Screenshot_2026-09-26_104018_9a87b66d.png',
  empowered: '/assets/aistudio/Screenshot_2026-09-26_103943_911199a5.png',
  excited_jump: '/assets/aistudio/Screenshot_2026-09-26_104027_37d3e86b.png',
  explain: '/assets/aistudio/Screenshot_2026-05-02_122420_414d1f8e.jpg',
};

export interface MiyuTooltipGuide {
  title: string;
  titleJa: string;
  en: string;
  ja: string;
  pose: MiyuPose;
  badge?: string;
}

// Explanations for each interactive button and section in the application
export const MIYU_BUTTON_EXPLANATIONS: Record<string, MiyuTooltipGuide> = {
  'nav-todolist': {
    title: 'Create TodoList',
    titleJa: 'Create TodoList (TodoList作成)',
    en: 'This is Create TodoList! Build dynamic columns (Text, Clickable URLs, Numbers, Dates), diminish or expand columns like Excel, zoom in/out, and navigate rapidly with Tab and arrow keys!',
    ja: 'ここが「Create TodoList」だよ！URLリンクや数値、日付列を自由に追加できて、Excelみたいに列幅を拡大・縮小できるの！Tabキーでの爆速入力やズーム機能もあるよ♪',
    pose: 'welcome',
    badge: 'Matrix Core',
  },
  'nav-library': {
    title: 'Create Inventory Software',
    titleJa: 'Create Inventory Software (ソフトウェア棚卸作成)',
    en: 'Browse our complete collection of technical PDFs in Machine Learning, Computer Vision, RAG, CompTIA, Cisco, GCP, and Unreal Engine with live reading!',
    ja: '機械学習やコンピュータビジョン、クラウド、ゲームエンジンの技術書PDFを快適に読書・検索できる本棚だよ！',
    pose: 'empowered',
    badge: 'PDF Shelf',
  },
  'nav-loans': {
    title: 'Loans Dashboard',
    titleJa: '貸出管理ダッシュボード',
    en: 'Track active book borrowings, renewal dates, overdue alerts, and Gundam terminal allocations in real-time.',
    ja: '現在借りられている書籍の返却期限や延長申請、利用者の貸出状況を一目で把握できるダッシュボードだよ！',
    pose: 'talking',
    badge: 'Loans',
  },
  'nav-equipment': {
    title: 'Create Inventory Equipment',
    titleJa: 'Create Inventory Equipment (機材棚卸作成)',
    en: 'Manage and monitor all Gundam workstation terminals (Freedom, Justice, Destiny) and assign equipment to users.',
    ja: 'FreedomやJusticeなどのGundam端末やPC機材の利用状況を管理して、学生やエンジニアに割り当てられるよ！',
    pose: 'excited_jump',
    badge: 'Hardware',
  },
  'nav-upload': {
    title: 'AI Bulk PDF Upload',
    titleJa: 'AI一括ドキュメント取込',
    en: 'Drop folders of PDF or Word documents. Gemini AI automatically analyzes the text and classifies titles, topics, and authors!',
    ja: 'PDFやWordファイルをドロップすると、Gemini AIが自動で内容を読んでカテゴリやタイトルを分類してくれるよ！',
    pose: 'empowered',
    badge: 'AI Intake',
  },
  'nav-settings': {
    title: 'System Settings & SMTP',
    titleJa: '設定・SMTPメール通知',
    en: 'Configure SMTP credentials for live email delivery, cloud sync settings, and database management.',
    ja: '貸出リマインダーや共有メールを届けるSMTPサーバーの設定やクラウド連携を調整できるよ！',
    pose: 'thinking',
    badge: 'Config',
  },
  'matrix-add-db': {
    title: 'Add New Database',
    titleJa: '新規マトリックス作成',
    en: 'Create a brand new custom matrix table with unique columns, custom views, and instant persistence.',
    ja: '新しいマトリックスデータベースを作って、用途に応じた専用シートを追加できるよ！',
    pose: 'happy_rawr',
    badge: 'Create DB',
  },
  'matrix-add-row': {
    title: 'Add New Row',
    titleJa: '新しい行を追加',
    en: 'Insert a new row into the matrix. Tip: Pressing Tab on the last cell also adds a new row automatically!',
    ja: '表に新しい行を追加するよ。一番右下のセルで「Tabキー」を押しても自動で新しい行が増えるよ♪',
    pose: 'explain',
    badge: 'Insert Row',
  },
  'matrix-add-col': {
    title: 'Add New Column',
    titleJa: '新しい列を追加',
    en: 'Add a new column and choose its type: Text, Clickable URL hyperlink, Number, Date, or Status category!',
    ja: 'テキスト、クリックできるURLリンク、数値、日付など、好きなデータ型の列を自由に追加できるよ！',
    pose: 'welcome',
    badge: 'Custom Col',
  },
  'matrix-zoom-in': {
    title: 'Matrix Zoom In',
    titleJa: 'マトリックス拡大ズーム',
    en: 'Increase the matrix magnification (up to 150%) for high readability and detailed cell inspection.',
    ja: 'マトリックスを大きくズームして、文字や数値をくっきり見やすく拡大するよ！',
    pose: 'happy_rawr',
    badge: 'Zoom +',
  },
  'matrix-zoom-out': {
    title: 'Matrix Zoom Out',
    titleJa: 'マトリックス縮小ズーム',
    en: 'Decrease matrix magnification (down to 50%) to visualize massive matrices with 20+ columns without scrolling!',
    ja: 'マトリックスを小さくズームして、たくさんの列がある大きな表も1画面にすっきり収めるよ！',
    pose: 'talking',
    badge: 'Zoom -',
  },
  'matrix-fit': {
    title: 'Fit Matrix to Screen',
    titleJa: '画面に全体フィット',
    en: 'Auto-calculates the optimal zoom scale so every column fits horizontally inside your current screen width!',
    ja: 'すべての列が横スクロールなしで画面にぴったり収まるように、自動で最適な倍率に計算してくれるよ！',
    pose: 'excited_jump',
    badge: 'Auto Fit',
  },
  'matrix-diminish': {
    title: 'Diminish / Compress Columns',
    titleJa: '列幅をコンパクト縮小',
    en: 'Toggle compact 95px column mode to quickly shrink all columns like a dense Excel sheet!',
    ja: 'すべての列を一瞬で95pxのコンパクト幅にギュッと縮小して、大量のデータを一望できるよ！',
    pose: 'explain',
    badge: 'Compact',
  },
  'matrix-shortcuts': {
    title: 'Keyboard Shortcuts & CRUD',
    titleJa: 'キーボード操作＆CRUD解説',
    en: 'View fast navigation shortcuts: Tab/Shift+Tab to jump between columns, Enter/Down to move rows, Esc to blur.',
    ja: 'Tabで列移動、Shift+Tabで戻る、Enterで下の行へ！Excel以上のスピードで入力できるショートカット集だよ！',
    pose: 'empowered',
    badge: 'Shortcuts',
  },
  'matrix-share': {
    title: 'Share TodoList to Customer',
    titleJa: '顧客へのマトリックス共有',
    en: 'Send this matrix directly to a customer via international cellphone SMS/WhatsApp or verified SMTP email!',
    ja: '国番号付きの携帯電話やメールで、作成したマトリックス表を直接クライアントや仲間に送信できるよ！',
    pose: 'welcome',
    badge: 'Share',
  },
  'matrix-export': {
    title: 'Export to Excel / CSV',
    titleJa: 'Excel / CSV エクスポート',
    en: 'Download the current matrix as a clean CSV or spreadsheet file compatible with Excel and Google Sheets.',
    ja: '今見ているマトリックスをExcelやGoogleスプレッドシートで開けるCSVファイルとして即座にダウンロード！',
    pose: 'happy_rawr',
    badge: 'Export',
  },
  'header-equipment': {
    title: 'Active Gundam Terminal',
    titleJa: 'アクティブ端末切替',
    en: 'Switch the active Gundam terminal workstation being used by the current operator or student.',
    ja: '現在操作しているGundamワークステーション端末（Freedom, Justiceなど）を切り替えるよ！',
    pose: 'talking',
    badge: 'Terminal',
  },
  'header-firebase': {
    title: 'Cloud Database Status',
    titleJa: 'クラウド同期ステータス',
    en: 'Shows live Firestore synchronization status. Green pulse means all changes persist automatically to Google Cloud.',
    ja: 'Google Cloud Firestoreとの同期状態を表示しているよ。緑色のランプが点滅していれば即座に保存されている証拠だよ！',
    pose: 'empowered',
    badge: 'Cloud Sync',
  },
  'header-language': {
    title: 'Language Switcher',
    titleJa: '言語切り替え',
    en: 'Toggle application language between English (🇬🇧), Japanese (🇯🇵), and Spanish (🇪🇸).',
    ja: '日本語、英語、スペイン語の3言語を瞬時に切り替えることができるよ！',
    pose: 'welcome',
    badge: 'Locale',
  },
  'header-theme': {
    title: 'Day / Night Theme',
    titleJa: '和紙テーマ / 墨ダークモード',
    en: 'Switch between Japanese traditional Washi paper (light mode) and Sumi ink aesthetic (dark mode).',
    ja: '伝統的な和紙の上品なライトモードと、落ち着いた墨のダークモードを切り替えられるよ！',
    pose: 'happy_rawr',
    badge: 'Theme',
  },
  'header-google': {
    title: 'Google Account Authentication',
    titleJa: 'Google アカウント連携',
    en: 'Sign in with your Google account to unlock member privileges and personalized reading archives.',
    ja: 'Googleアカウントでログインすると、個人の読書履歴や貸出データが安全に紐づけられるよ！',
    pose: 'talking',
    badge: 'Auth',
  },
  'bottom-firebase-settings': {
    title: 'Firebase & Settings',
    titleJa: 'Firebase ＆ 各種システム設定',
    en: 'Open the complete Firebase configuration, cloud persistence status, and verified SMTP email delivery settings.',
    ja: 'Firebaseのクラウド同期設定や、貸出通知用SMTPメールの設定画面を開くよ！',
    pose: 'welcome',
    badge: 'Config',
  },
  'bottom-manage-panels': {
    title: 'Manage Workspace Panels',
    titleJa: 'ワークスペース・パネル管理',
    en: 'Customize which panels appear in your workspace! Hide, show, or restore panels (TodoList, Library, Loans, Upload, etc.) at any time.',
    ja: '表示するパネルを自由にカスタマイズ！非表示にしたパネルを復元したり、すっきり整理できるよ♪',
    pose: 'empowered',
    badge: 'Customizer',
  },
};
