# MyBudget Backend API

A robust, secure, and scalable backend for the MyBudget personal finance application built with Next.js API routes and PostgreSQL.

## 🚀 Features

### ✅ **Authentication & Security**
- JWT-based authentication with bcrypt password hashing
- Secure middleware for protected routes
- Input validation with Zod schemas
- User session management

### ✅ **Core Financial Management**
- **Budgets**: Create, read, update, delete budgets with categories
- **Transactions**: Full CRUD operations with budget category linking
- **Savings Goals**: Goal management with milestones and progress tracking
- **User Profiles**: Comprehensive user settings and preferences

### ✅ **Advanced Analytics**
- **Dashboard**: Real-time financial overview and insights
- **Reports**: Multiple report types (monthly, category, trends, budget)
- **Trends**: Spending patterns and financial health metrics
- **Budget Tracking**: Actual vs. planned spending analysis

### ✅ **Data Integrity**
- Database transactions for data consistency
- Proper foreign key relationships
- Automatic timestamp management
- Soft deletes for important data

## 🏗️ Architecture

### **Technology Stack**
- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT + bcrypt
- **Validation**: Zod schemas
- **Language**: TypeScript

### **Database Schema**
The backend uses a normalized PostgreSQL schema with:
- **Users**: Profile, preferences, financial settings
- **Budgets**: Budget plans with categories
- **Transactions**: Income/expense tracking
- **Goals**: Savings goals with milestones
- **Achievements**: Gamification system

### **API Structure**
```
/api
├── /auth
│   ├── /login          # User login
│   └── /register       # User registration
├── /budgets            # Budget CRUD operations
├── /transactions       # Transaction management
├── /goals              # Savings goals
├── /dashboard          # Financial overview
├── /user
│   ├── /profile        # User profile management
│   └── /change-password # Password updates
└── /reports            # Financial reports
```

## 🛠️ Setup & Installation

### **Prerequisites**
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### **1. Install Dependencies**
```bash
npm install
```

### **2. Database Setup**
```bash
# Create PostgreSQL database
createdb mybudget

# Run database setup script
npm run db:setup
```

### **3. Environment Configuration**
Copy `env.example` to `.env.local` and configure:
```bash
# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=mybudget
DB_PASSWORD=your_password
DB_PORT=5432

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
```

### **4. Start Development Server**
```bash
npm run dev
```

## 📚 API Documentation

### **Authentication**

All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

#### **POST /api/auth/register**
Create a new user account.
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "currency": "USD",
  "language": "en"
}
```

#### **POST /api/auth/login**
Authenticate user and receive JWT token.
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### **Budgets**

#### **GET /api/budgets**
Retrieve all budgets for the authenticated user.

#### **POST /api/budgets**
Create a new budget with categories.
```json
{
  "name": "Monthly Budget",
  "method": "50-30-20",
  "totalIncome": 5000,
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "categories": [
    {
      "name": "Housing",
      "allocated": 2500,
      "color": "#3B82F6",
      "isEssential": true
    }
  ]
}
```

#### **PUT /api/budgets**
Update an existing budget.

#### **DELETE /api/budgets?id=<budget_id>**
Delete a budget.

### **Transactions**

#### **GET /api/transactions**
Retrieve transactions with filtering options:
- `?page=1&limit=20` - Pagination
- `?category=Food` - Filter by category
- `?type=expense` - Filter by type
- `?startDate=2024-01-01&endDate=2024-01-31` - Date range

#### **POST /api/transactions**
Create a new transaction.
```json
{
  "amount": 50.00,
  "description": "Grocery shopping",
  "category": "Food",
  "date": "2024-01-15",
  "type": "expense",
  "budgetCategoryId": "uuid-here"
}
```

#### **PUT /api/transactions**
Update an existing transaction.

#### **DELETE /api/transactions?id=<transaction_id>**
Delete a transaction.

### **Goals**

#### **GET /api/goals**
Retrieve savings goals with optional filters:
- `?includeInactive=true` - Include inactive goals
- `?category=emergency` - Filter by category
- `?priority=high` - Filter by priority

#### **POST /api/goals**
Create a new savings goal.
```json
{
  "name": "Emergency Fund",
  "description": "Save 6 months of expenses",
  "targetAmount": 15000,
  "targetDate": "2024-12-31",
  "category": "emergency",
  "priority": "high"
}
```

#### **PUT /api/goals**
Update an existing goal.

#### **DELETE /api/goals?id=<goal_id>**
Soft delete a goal.

#### **PATCH /api/goals**
Add a milestone to a goal.
```json
{
  "goalId": "uuid-here",
  "milestone": {
    "amount": 1000,
    "description": "First milestone reached!"
  }
}
```

### **Dashboard**

#### **GET /api/dashboard**
Get comprehensive financial overview including:
- Budget summary
- Recent transactions
- Goal progress
- Spending by category
- Budget vs actual spending
- Savings trends

### **User Profile**

#### **GET /api/user/profile**
Retrieve user profile information.

#### **PUT /api/user/profile**
Update user profile settings.

#### **PATCH /api/user/profile**
Update user avatar.

### **Password Management**

#### **PUT /api/user/change-password**
Change user password.
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword",
  "confirmPassword": "newpassword"
}
```

### **Reports**

#### **GET /api/reports**
Generate financial reports with parameters:
- `?type=monthly&startDate=2024-01-01&endDate=2024-01-31`
- `?type=category&startDate=2024-01-01&endDate=2024-01-31`
- `?type=trends&startDate=2024-01-01&endDate=2024-01-31`
- `?type=budget&startDate=2024-01-01&endDate=2024-01-31`

## 🔒 Security Features

### **Authentication**
- JWT tokens with configurable expiration
- Secure password hashing with bcrypt
- Protected route middleware

### **Input Validation**
- Zod schema validation for all inputs
- SQL injection prevention with parameterized queries
- XSS protection with proper output encoding

### **Data Protection**
- User data isolation
- Foreign key constraints
- Transaction rollback on errors

## 📊 Database Schema

### **Core Tables**
- **users**: User accounts and profiles
- **budgets**: Budget plans and periods
- **budget_categories**: Budget category allocations
- **transactions**: Financial transactions
- **savings_goals**: Savings targets
- **milestones**: Goal progress tracking

### **Relationships**
- Users have many budgets
- Budgets have many categories
- Transactions can link to budget categories
- Users have many savings goals
- Goals have many milestones

## 🚀 Performance Optimizations

### **Database**
- Proper indexing on frequently queried fields
- Connection pooling for efficient database connections
- Optimized queries with JOINs and aggregations

### **API**
- Pagination for large datasets
- Efficient data aggregation
- Caching-friendly response structures

## 🧪 Testing

### **Database Setup**
```bash
# Run database setup
npm run db:setup

# Run migrations (if any)
npm run db:migrate
```

### **API Testing**
Use tools like Postman or curl to test endpoints:

```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🔧 Development

### **Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:setup     # Setup database
npm run db:migrate   # Run migrations
npm run type-check   # TypeScript type checking
```

### **File Structure**
```
app/
├── api/             # API routes
├── globals.css      # Global styles
└── layout.tsx       # Root layout

lib/
├── auth.ts          # Authentication utilities
├── auth-middleware.ts # Auth middleware
├── database.ts      # Database connection
└── utils.ts         # Utility functions

database/
└── schema.sql       # Database schema

scripts/
└── setup-database.ts # Database setup script
```

## 🚀 Deployment

### **Environment Variables**
Ensure all environment variables are set in production:
- Database connection details
- JWT secret (use strong, unique key)
- CORS origins
- SSL configuration

### **Database**
- Use production PostgreSQL instance
- Configure connection pooling
- Set up proper backups
- Monitor performance

### **Security**
- Change default JWT secret
- Use HTTPS in production
- Configure proper CORS origins
- Set up rate limiting if needed

## 🤝 Contributing

1. Follow the existing code style
2. Add proper error handling
3. Include input validation
4. Write clear commit messages
5. Test your changes thoroughly

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information

---

**Built with ❤️ for better financial management**
