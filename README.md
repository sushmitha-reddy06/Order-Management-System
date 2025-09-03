# Order Management System (OMS)
A B2B Order Management System built with Node.js, Express, and PostgreSQL. Supports Buyers, Suppliers, and Admin roles with complete order lifecycle management, inventory tracking, and admin analytics.

---

# Tech Stack :

> Backend: Node.js, Express

> Database: PostgreSQL + Prisma ORM

> Authentication: JWT (Access & Refresh tokens)

> Dev Tools: Nodemon, Prisma Studio, Swagger

---

# API Endpoints (Base/Prefix URL: /api)

## **Authentication**:

* POST /auth/register – Register user

* POST /auth/login – Login

* GET /auth/me – Get current user

* POST /auth/logout – Logout
---
## **Public**:

* GET /public/products – Browse products

* GET /public/products/search – Search products

* GET /public/products/:id – Product details

* GET /public/categories – Categories
---
## **Buyer**:

* POST /buyer/orders – Place order

* GET /buyer/orders – Get buyer orders

* PATCH /buyer/orders/:id/cancel – Cancel order
---
## **Supplier**:

* POST /seller/addProducts – Add product

* GET /seller/getAllProducts – Supplier products

* PUT /seller/updateProduct/:id – Update product

* PATCH /seller/updateStockProduct/:id/stock – Update stock

* GET /seller/getOrders – Supplier orders
---
## **Admin**:

* GET /admin/users – All users

* PATCH /admin/users/:id/status – Update user status

* DELETE /admin/users/:id – Delete user

* GET /admin/orders – All orders

* GET /admin/products – All products

* GET /admin/analytics – Analytics dashboard

---

# Installation & Setup Guide:

* git clone 'your-repository-url' then cd 'repo_folder'

* npm install #Install dependencies

* NOTE: Refer to the env.example file and proceed with your own credentials and configurations for .env file 

* npx prisma migrate dev --name init # Run database migrations

* node prisma/seed.js # Seed initial data

* npm run dev # Start development server (starts on port: 3000 or your change to desired port)

---

# API Documentation (Swagger)
* URL: http://localhost:3000/swagger/#/ #change the port number as per your running server port 
* URL: http://localhost:3000/api-docs/#/ #change the port number as per your running server port 



