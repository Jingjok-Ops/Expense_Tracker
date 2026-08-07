# FinFlow / ExpenseTracker

แอพบันทึกรายรับรายจ่ายแบบ SPA มี 3 แท็บหลัก: หน้าแรก, บันทึกรายการ, และรายงาน

เอกสารรายละเอียดทีละไฟล์และฟังก์ชันอยู่ที่ [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

## ไฟล์หลัก

- [index.html](index.html) โครงหน้าแอปและจุดโหลดสคริปต์
- [styles.css](styles.css) สไตล์หลักของทั้งโปรเจกต์
- [db.js](db.js) helper ฝั่ง browser สำหรับเรียก API
- [js/core.js](js/core.js) แกนหลักของ state และการเริ่มต้นแอป
- [js/main.js](js/main.js) event listener และ interaction หลัก
- [backend/server.js](backend/server.js) API server หลัก
- [backend/db.js](backend/db.js) MySQL connection helper
- [backend/schema.sql](backend/schema.sql) โครงสร้างฐานข้อมูล

## วิธีรัน

1. ตั้งค่า `.env` ในโฟลเดอร์ `backend`
2. รัน `npm install`
3. รัน `npm start`
4. เปิด `http://localhost:3001`