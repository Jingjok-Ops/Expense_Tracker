# ExpenseTracker / FinFlow Overview

โปรเจกต์นี้คือแอพบันทึกรายรับรายจ่ายชื่อ FinFlow โดยแยกงานออกเป็น 4 ชั้นหลัก: หน้าเว็บ, logic ฝั่ง browser, API ฝั่งเซิร์ฟเวอร์, และสคริปต์ช่วยงานด้านรูปภาพ

## ภาพรวมระบบ

แอปนี้เป็น SPA ที่หน้าเดียวรองรับ 3 แท็บหลัก: หน้าแรก, บันทึกรายการ, และรายงาน ข้อมูลจริงถูกเก็บผ่าน API ไปยัง MySQL ส่วนฝั่ง browser มี fallback ไปที่ `localStorage` หาก backend ใช้งานไม่ได้ และมี service worker ช่วย cache ไฟล์สำคัญสำหรับการใช้งานแบบ offline บางส่วน

### Flow การทำงานแบบย่อ

1. เปิด `index.html`
2. โหลดสไตล์, service worker, Chart.js, และสคริปต์ของแอป
3. `js/core.js` เริ่มต้น state, โหลดข้อมูล, และเตรียม UI
4. `db.js` เรียก API ไปที่ `backend/server.js`
5. `backend/server.js` รับ request แล้วใช้ `backend/db.js` คุยกับ MySQL
6. `backend/schema.sql` คือโครงสร้างตารางที่รองรับข้อมูล wallet และ transaction
7. `js/main.js` จัดการ interaction ทั้งหมด เช่น tab, filter, import/export, และ PWA

## ไฟล์ระดับรากโปรเจกต์

### [package.json](package.json)

ไฟล์กำหนดโปรเจกต์ Node.js ตัวนี้ ใช้บอกชื่อโปรเจกต์, entry point, dependency, และคำสั่งสำหรับรันแอป

- `main` ชี้ไปที่ `backend/server.js`
- `start` และ `dev` ใช้รันเซิร์ฟเวอร์ด้วย Node
- dependency หลักคือ `express`, `mysql2`, และ `dotenv`

### [package-lock.json](package-lock.json)

ไฟล์ล็อกเวอร์ชัน dependency ให้ตรงกับตอนติดตั้งล่าสุด ใช้เพื่อให้เครื่องอื่นติดตั้งได้ผลลัพธ์เหมือนกัน

### [index.html](index.html)

เป็นโครงหน้าแอปหลักทั้งหมด มีทั้ง:

- header พร้อมปุ่มเปลี่ยนธีม
- navigation 3 แท็บ
- หน้า Home ที่แสดงยอดรวม, wallet, และรายการธุรกรรม
- หน้า Add สำหรับเพิ่มและแก้ไขรายการ
- หน้า Reports สำหรับดูกราฟและสถิติ
- modal สำหรับเพิ่ม/แก้ไขกระเป๋าเงิน
- จุดโหลดสคริปต์ทั้งหมดที่ท้ายไฟล์

ไฟล์นี้ยังมี critical CSS และ font preload เพื่อให้หน้าไม่กระพริบสีดำตอนโหลดแรก

### [styles.css](styles.css)

สไตล์หลักของทั้งแอป มีบทบาทเป็น design system กลางของโปรเจกต์

- กำหนดตัวแปรสี, radius, shadow, และฟอนต์
- รองรับหลายธีม เช่น dark, light, และ cat
- คุม layout หลักของหน้า, glassmorphism, ปุ่ม, และพื้นหลัง
- import สไตล์ย่อยของแต่ละหน้าไว้ที่ส่วนบนสุด

### [sw.js](sw.js)

service worker สำหรับทำ cache ของไฟล์สำคัญ

- cache ไฟล์ shell หลักของแอปตอน install
- ลบ cache รุ่นเก่าตอน activate
- ใช้แนวคิด stale-while-revalidate สำหรับ request บนเครือข่าย
- ไม่ cache ระหว่างพัฒนาใน localhost เพื่อเลี่ยงปัญหา cache ค้าง

### [manifest.json](manifest.json)

ข้อมูลสำหรับ PWA

- ชื่อแอปและชื่อย่อ
- start URL และ display mode
- สีพื้นหลังและสีธีม
- ไอคอนสำหรับติดตั้งเป็นแอปบนอุปกรณ์

### [db.js](db.js)

ตัวกลางฝั่ง client สำหรับคุยกับ backend ผ่าน HTTP API

- ตั้งค่า base URL ของ API
- ตรวจสุขภาพระบบด้วย `/health`
- มีฟังก์ชันสำหรับ wallet และ transaction ทั้ง CRUD
- ใช้ `fetchJson()` เป็น helper กลางสำหรับแปลง response และจับ error

## โค้ดฝั่งหน้าเว็บ

### [js/core.js](js/core.js)

นี่คือแกนหลักของแอปฝั่ง browser และเป็นไฟล์ที่รวม logic สำคัญที่สุดของฝั่งหน้าเว็บ

หน้าที่หลัก:

- เก็บ `state` ของแอป เช่น transactions, wallets, theme, และ selected wallet
- อ่าน DOM element ที่ต้องใช้ซ้ำ
- เริ่มต้นค่าเริ่มต้นของฟอร์มและธีม
- โหลดข้อมูลจาก backend หรือ fallback ไป localStorage
- สร้าง wallet เริ่มต้นถ้ายังไม่มีข้อมูล
- ย้ายข้อมูลเก่าจาก localStorage ไป MySQL ถ้าพบข้อมูลเดิม
- เรียก `render()` เพื่อวาดข้อมูลบนหน้า

ฟังก์ชันสำคัญที่อยู่ในไฟล์นี้:

- `initApp()` เริ่มแอปทั้งหมดเมื่อ DOM พร้อม
- `setupMockData()` สร้างข้อมูลตัวอย่างถ้าฐานข้อมูลว่าง
- `getTodayDateString()` ช่วยคำนวณวันที่ตาม offset
- `saveStateToStorage()` บันทึก state ลง localStorage
- `handleTransactionTypeChange()` ปรับฟอร์มตาม type ของรายการ
- `populateWalletsDropdowns()` เติมรายการ wallet ลง select ต่าง ๆ
- `renderWallets()` แสดงการ์ดกระเป๋าเงินและคำนวณยอดคงเหลือ
- `handleWalletDeletion()` ลบ wallet แบบเช็กการใช้งานก่อน
- `handleAddWallet()` เพิ่มหรือแก้ไข wallet
- `showToast()` แสดงข้อความแจ้งเตือนสั้น ๆ

### [js/views/home.js](js/views/home.js)

ไฟล์นี้โฟกัสที่หน้า Home และ logic การแสดงข้อมูลภาพรวม

- คำนวณยอดรวมรายรับ, รายจ่าย, และยอดคงเหลือ
- แยกการคำนวณตาม wallet ที่เลือกหรือรวมทุกบัญชี
- กรองรายการธุรกรรมตามประเภท, วันที่, ค้นหา, และ wallet
- render รายการธุรกรรมเป็น list
- แสดงปุ่มแก้ไขและลบในแต่ละรายการ
- เรียก `renderWallets()` และ `updateAnalyticsChart()` เพื่อให้ข้อมูลทุกส่วน sync กัน

### [js/views/add.js](js/views/add.js)

ไฟล์นี้ดูแลฟอร์มเพิ่มและแก้ไขรายการธุรกรรม

- จัดการหมวดหมู่ของรายรับและรายจ่ายผ่าน `CATEGORIES`
- สลับฟอร์มตาม type: expense, income, transfer
- ตรวจสอบจำนวนเงินด้วย `validateAmountField()`
- สร้าง transaction object ก่อนส่งไป backend
- รองรับโหมดเพิ่มใหม่และแก้ไขรายการเดิม
- จัดการการย้ายเงินระหว่างกระเป๋าแบบ transfer
- ปรับ form state, ปุ่มยืนยัน, และข้อความแจ้งผลหลังบันทึก

ฟังก์ชันหลักที่ควรจำ:

- `populateCategories()` เติม dropdown หมวดหมู่
- `getCategoryInfo()` หา label, icon, และ color ของหมวดหมู่
- `handleAddTransaction()` บันทึกรายการใหม่หรือแก้รายการเดิม
- `startEditTransaction()` โหลดข้อมูลเดิมกลับเข้า form
- `resetEditFormState()` คืนฟอร์มกลับสภาพปกติ
- `deleteTransaction()` ลบรายการธุรกรรม

### [js/views/reports.js](js/views/reports.js)

ไฟล์นี้เป็น logic ของหน้ารายงานและกราฟวิเคราะห์

- จัดการการสลับแท็บไปยังหน้า Reports
- คำนวณช่วงเวลาแบบ day, week, month, year
- สร้าง doughnut chart แสดงสัดส่วนรายรับหรือรายจ่าย
- แสดง legend พร้อมยอดเงินและเปอร์เซ็นต์
- รองรับการเปลี่ยนประเภทกราฟและช่วงเวลาแบบ interactive
- มี comparison chart สำหรับดูแนวโน้มรายช่วงเวลา

ฟังก์ชันหลัก:

- `switchTab()` เปิดแท็บที่ต้องการและจัดการ scroll
- `getDateRangeForTimeframe()` แปลง timeframe เป็นช่วงวันเริ่ม/จบ
- `updateAnalyticsChart()` สร้างและอัปเดตกราฟหลัก

## สไตล์ตามหน้า

### [styles/views/home.css](styles/views/home.css)

สไตล์เฉพาะของหน้า Home

- การ์ดสรุปยอดเงิน
- split cards ของรายรับ/รายจ่าย
- รายการธุรกรรมและ filter bar
- wallet cards และสถานะ active

### [styles/views/add.css](styles/views/add.css)

สไตล์เฉพาะของหน้า Add

- layout ของฟอร์ม
- input, select, และ validation state
- type selector แบบ radio switch
- date shortcut buttons

### [styles/views/reports.css](styles/views/reports.css)

สไตล์เฉพาะของหน้า Reports

- layout แบบสองคอลัมน์สำหรับกราฟและสรุป
- analytics controls
- donut chart wrapper และ overlay กลางกราฟ
- legend card, comparison section, และ empty state

## ฝั่งเซิร์ฟเวอร์

### [backend/server.js](backend/server.js)

Express server หลักของระบบ ทำหน้าที่เป็น API และเป็นตัวเสิร์ฟหน้าแอป

หน้าที่หลัก:

- เปิดใช้งาน `express.json()` เพื่อรับ body แบบ JSON
- ตั้ง `Cache-Control: no-store` สำหรับ response
- เสิร์ฟไฟล์ static จาก root ของโปรเจกต์
- มี route `/api/health` สำหรับเช็ก MySQL
- มี route CRUD ของ wallets และ transactions
- คืนค่า `index.html` เมื่อเปิด route `/`

แนวคิดสำคัญ:

- ใช้ `ON DUPLICATE KEY UPDATE` เพื่อรองรับการ save แบบ upsert
- แปลงค่าตัวเลขให้เป็น `Number` ก่อนส่งกลับ
- สร้าง timestamp `createdAt` และ `updatedAt` สำหรับข้อมูล

### [backend/db.js](backend/db.js)

helper สำหรับเชื่อมต่อ MySQL ด้วย `mysql2/promise`

- อ่านค่าการเชื่อมต่อจาก environment variables
- สร้าง connection pool แบบ reuse ได้
- มี `pingDatabase()` สำหรับ health check
- มี `query()` เป็น wrapper สำหรับ execute SQL

### [backend/schema.sql](backend/schema.sql)

สคริปต์สร้างฐานข้อมูลและโครงสร้างตาราง

- สร้าง database `finflow`
- สร้างตาราง `wallets` สำหรับเก็บข้อมูลกระเป๋าเงิน
- สร้างตาราง `transactions` สำหรับเก็บรายการรับ-จ่าย-โอน
- มี index สำหรับค้นหาตามวันที่, type, และ wallet ที่ใช้บ่อย

### [backend/.env.example](backend/.env.example)

ตัวอย่างค่าตั้งค่าฝั่ง backend

- host, port, username, password, และ database ของ MySQL
- port ของเซิร์ฟเวอร์ Node

## สคริปต์ช่วยงานรูปภาพ

### [process_images.py](process_images.py)

สคริปต์สำหรับแปลงภาพจากโฟลเดอร์ brain ให้เป็นไฟล์ใช้งานจริง

- หาไฟล์ PNG ล่าสุดที่ตรงกับ prefix ที่กำหนด
- เปิดภาพด้วย Pillow
- ลบสีเขียวที่ใช้เป็นพื้นหลังออกให้โปร่งใส
- เซฟเป็นชื่อไฟล์ปลายทางในโฟลเดอร์ `images`

### [process_single.py](process_single.py)

สคริปต์เวอร์ชันย่อของงานเดียวกัน

- ใช้กับภาพเป้าหมายเดียว
- logic หลักเหมือน `process_images.py`
- เหมาะกับกรณีต้องการประมวลผลไฟล์เดียวแบบเร็ว ๆ

### [add_orange_bg.py](add_orange_bg.py)

สคริปต์สร้างไอคอนแอป

- เปิดภาพโปร่งใสของแมว
- สร้างพื้นหลังสีส้ม
- วางภาพทับลงไป
- เซฟเป็น `app_icon_orange.png`

## สรุปโครงสร้างแบบสั้น

แอปนี้ทำงานแบบ front-end SPA + MySQL API โดย `index.html` เป็นตัวรวมทุกอย่าง, `js/core.js` และไฟล์ใน `js/views/` เป็น logic ฝั่งหน้าเว็บ, `db.js` เป็น bridge ไป backend, และ `backend/server.js` เป็นตัวคุยกับฐานข้อมูลจริง

ถ้าจะอ่านต่อแบบลงลึก แนะนำไล่จาก `index.html` -> `js/core.js` -> `js/main.js` -> `backend/server.js` เพราะจะเห็น flow ตั้งแต่หน้าเว็บจนถึงฐานข้อมูลชัดที่สุด