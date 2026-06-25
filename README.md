# Project 8 - Badminton Class Booking System

Ứng dụng fullstack dùng để quản lý và đăng ký lớp học cầu lông. Admin có thể tạo lớp học, chỉnh sửa thông tin lớp, xóa lớp, xem danh sách học viên và giới hạn số lượng học viên trong từng lớp. Người dùng có thể xem lịch học, tìm kiếm/lọc lớp, đăng ký tham gia, hủy đăng ký và quản lý các lớp đã đăng ký.

Đây là project tập trung vào việc kết nối Frontend React với Backend Node.js/Express tự xây dựng, bao gồm xác thực người dùng, phân quyền theo vai trò, gọi protected API bằng JWT và cấu hình deploy thực tế.

## Công Nghệ Sử Dụng

- Frontend: React, Vite, React Router, Axios, TanStack React Query
- Backend: Node.js, Express, MongoDB, Mongoose
- Authentication: JWT, bcrypt
- Deployment: Vercel cho frontend, Render cho backend

## Entities Chính

### User

- `role`: `admin` | `user`

### Class

- `title`
- `description`
- `coachName`
- `level`: `beginner` | `intermediate` | `advanced`
- `startDate`
- `schedule`
- `location`
- `maxStudents`
- `createdBy`: tham chiếu đến `User`

### Enrollment

- `class`: tham chiếu đến `Class`
- `user`: tham chiếu đến `User`
- `enrolledAt`

## Chức Năng

### Public

- Xem danh sách lớp học sắp khai giảng
- Tìm kiếm lớp học theo tên, huấn luyện viên hoặc mô tả
- Lọc lớp học theo trình độ
- Xem chi tiết lớp học
- Xem số lượng học viên hiện tại và số lượng tối đa của từng lớp

### User

- Đăng ký tài khoản và đăng nhập
- Đăng ký tham gia lớp học sau khi đăng nhập
- Hủy đăng ký lớp học
- Xem danh sách các lớp đã đăng ký
- Truy cập các route được bảo vệ bằng JWT

### Admin

- Tạo lớp học mới
- Chỉnh sửa thông tin lớp học
- Xóa lớp học
- Xem danh sách học viên của từng lớp
- Chỉ tài khoản có `role: admin` mới được truy cập chức năng quản trị

## Business Rules

- Không thể đăng ký trùng một lớp học.
- Không thể đăng ký khi lớp học đã đủ số lượng học viên.
- Chỉ Admin mới được tạo, chỉnh sửa và xóa lớp học.
- Mỗi lớp học phải hiển thị số lượng học viên hiện tại và số lượng tối đa.
- API cần đăng nhập phải có JWT hợp lệ.
- API dành cho Admin cần vừa đăng nhập vừa có quyền Admin.

## Cấu Trúc Project

```text
.
|-- backend/
|   |-- src/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- app.js
|   |   `-- server.js
|   `-- package.json
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- hooks/
|   |   |-- pages/
|   |   `-- utils/
|   `-- package.json
`-- package.json
```

## API Tổng Quan

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Classes

- `GET /api/classes`
- `GET /api/classes/:id`
- `POST /api/classes` - chỉ Admin
- `PATCH /api/classes/:id` - chỉ Admin
- `DELETE /api/classes/:id` - chỉ Admin
- `GET /api/classes/:id/students` - chỉ Admin

### Enrollments

- `POST /api/classes/:id/enroll`
- `DELETE /api/classes/:id/enroll`
- `GET /api/classes/my/enrollments`

## Tích Hợp Frontend Với API

Frontend đã được tích hợp API bằng Axios và React Query.

- File cấu hình Axios nằm ở `frontend/src/api/axios.js`
- Base URL lấy từ biến môi trường `VITE_API_URL`
- Nếu không có `VITE_API_URL`, frontend sẽ dùng mặc định `http://localhost:5000/api`
- JWT token được tự động gắn vào header:

```text
Authorization: Bearer <token>
```

Các màn hình như danh sách lớp, chi tiết lớp, đăng ký/hủy đăng ký, dashboard Admin và danh sách học viên đều gọi API backend thông qua Axios và React Query.

## Biến Môi Trường

Không commit file `.env` thật hoặc secret lên repository.

### Backend `.env`

Tạo file `backend/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret
CLIENT_URL=http://localhost:5173
```

Tùy chọn khi muốn chạy local không cần MongoDB:

```env
USE_MEMORY_DB=true
```

### Frontend `.env`

Tạo file `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Cài Đặt Và Chạy Local

Cài dependencies cho toàn bộ project:

```bash
npm run install:all
```

Tạo dữ liệu mẫu:

```bash
npm run seed --prefix backend
```

Chạy frontend và backend cùng lúc:

```bash
npm run dev
```

URL mặc định khi chạy local:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Tài Khoản Demo

Sau khi chạy seed script:

```text
Admin
Email: admin@example.com
Password: password123

User
Email: user@example.com
Password: password123
```

## Deploy

### Frontend - Vercel

1. Tạo project Vercel từ thư mục `frontend/`.
2. Build command:

```bash
npm run build
```

3. Output directory:

```text
dist
```

4. Thêm biến môi trường:

```env
VITE_API_URL=https://your-render-backend.onrender.com/api
```

### Backend - Render

1. Tạo Render Web Service từ thư mục `backend/`.
2. Build command:

```bash
npm install
```

3. Start command:

```bash
npm start
```

4. Thêm biến môi trường:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret
CLIENT_URL=https://your-vercel-frontend.vercel.app
```

`CLIENT_URL` có thể nhận nhiều domain, phân tách bằng dấu phẩy nếu cần.

## SEO Và Share Link

Frontend đã có metadata cơ bản trong `frontend/index.html`:

- `title`
- `meta description`
- Open Graph tags
- Twitter card tags
- `og:image` trỏ tới logo public

Logo share link nằm trong:

```text
frontend/public/logo.png
```

Khi deploy production, nên đổi `og:image` sang URL đầy đủ dạng:

```text
https://your-domain.com/logo.png
```

## Kiến Thức Đã Học

- Gọi API từ React bằng Axios: `GET`, `POST`, `PATCH`, `DELETE`
- Gắn JWT vào request headers
- Dùng React Query để cache, refetch và mutation
- Authentication và Authorization theo role
- Cấu hình CORS
- Sử dụng environment variables cho cả FE và BE
- Flow đăng nhập end-to-end: login, lưu token, gọi protected API
- Quan hệ many-to-many thông qua model `Enrollment`
- Search, filter và pagination
- Loading state, empty state và error state
- Protected routes
- Deploy frontend lên Vercel và backend lên Render

## Done Criteria

- [x] Danh sách lớp học hiển thị đúng và có loading state
- [x] Tìm kiếm và lọc lớp học hoạt động
- [x] Đăng ký và hủy đăng ký lớp học hoạt động, cập nhật lại dữ liệu qua React Query
- [x] Không thể đăng ký trùng lớp học
- [x] Không thể đăng ký khi lớp học đã đủ chỗ
- [x] User xem được danh sách lớp đã đăng ký
- [x] Chỉ Admin mới được tạo, chỉnh sửa và xóa lớp học
- [x] Danh sách học viên hiển thị theo từng lớp
- [x] CORS được cấu hình
- [ ] Frontend deployed Vercel và Backend deployed Render
- [x] Không có API key hoặc secret bị expose trong source code

## Ghi Chú Bảo Mật

- Không commit `backend/.env`.
- Dùng `JWT_SECRET` mạnh khi deploy production.
- Giới hạn `CLIENT_URL` đúng domain frontend production.
- Chỉ expose biến môi trường frontend có prefix `VITE_`.
- Không đưa `MONGO_URI`, `JWT_SECRET` hoặc API key thật vào README, source code hoặc commit history.
