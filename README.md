# Treblle Hackathon Backend

A comprehensive API monitoring and analytics backend built for the Treblle Hackathon. This backend provides real-time API monitoring, security analysis, analytics aggregation, and user management capabilities.

## 🚀 Features

### Core Functionality
- **API Proxy & Monitoring** - Real-time request/response logging and analysis
- **Security Analysis** - Automatic security issue detection and scoring
- **Analytics Aggregation** - Pre-computed metrics for performance optimization
- **User Management** - OAuth and traditional authentication support
- **Project Management** - Multi-project support with endpoint discovery
- **Request Logging** - Comprehensive request/response data storage

### Advanced Features
- **Geographic Data** - IP-based location tracking
- **Real-time Processing** - Background request processing
- **Filtering & Sorting** - Advanced query capabilities for endpoints and requests
- **Pagination** - Efficient data retrieval with pagination support
- **Data Export** - Complete user data export functionality

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Security**: Automatic security analysis and scoring
- **Geolocation**: IP-based location services

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd treblle-hackathon-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   JWT_SECRET=your-jwt-secret-key
   INTERNAL_API_KEY=your-internal-api-key
   DATABASE_URL="file:./prisma/dev.db"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev
   
   # (Optional) Open Prisma Studio
   npx prisma studio
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:8080`

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### OAuth User Creation
```http
POST /api/auth/oauth-user
X-Internal-API-Key: your-internal-api-key
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "provider": "google",
  "providerId": "google-user-id"
}
```

### Project Management

#### Create Project
```http
POST /api/projects
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "My API Project",
  "originalBaseUrl": "https://api.example.com"
}
```

#### Get Projects
```http
GET /api/projects
Authorization: Bearer <jwt-token>
```

#### Get Project Endpoints
```http
GET /api/projects/{projectId}/endpoints?method=GET&status=healthy&timeRange=24h&sortBy=path&order=asc
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `method` - Filter by HTTP method (GET, POST, PUT, DELETE, etc.)
- `status` - Filter by endpoint status (healthy, error, all)
- `timeRange` - Filter by time range (1h, 24h, 7d, 30d)
- `sortBy` - Sort by field (path, method, requestCount, errorRate, avgResponseTime, lastRequest)
- `order` - Sort order (asc, desc)

#### Get Project Requests
```http
GET /api/projects/{projectId}/requests?method=POST&statusCode=4xx&timeRange=7d&sortBy=createdAt&order=desc&page=1&limit=20
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `method` - Filter by HTTP method
- `statusCode` - Filter by status code ranges (2xx, 4xx, 5xx, all)
- `timeRange` - Filter by time range (1h, 24h, 7d, 30d)
- `sortBy` - Sort by field (createdAt, method, path, responseCode, durationMs)
- `order` - Sort order (asc, desc)
- `page` - Pagination page number
- `limit` - Items per page

### User Profile Management

#### Update Profile
```http
PUT /api/user/profile
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "New User Name"
}
```

#### Change Password
```http
PUT /api/user/password
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "currentPassword": "current_password",
  "newPassword": "new_password"
}
```

#### Export User Data
```http
GET /api/user/export
Authorization: Bearer <jwt-token>
```

#### Delete Account
```http
DELETE /api/user/account
Authorization: Bearer <jwt-token>
```

### Analytics

#### Get Analytics Data
```http
GET /api/analytics/{projectId}
Authorization: Bearer <jwt-token>
```

### Proxy & Monitoring

#### Proxy Request
```http
POST /api/proxy/{projectId}/*
Authorization: Bearer <jwt-token>
```

The proxy automatically:
- Logs all request/response data
- Performs security analysis
- Updates analytics aggregations
- Tracks geographic data

## 🗄️ Database Schema

### Core Models

#### User
- `id` - Unique identifier
- `email` - User email (unique)
- `password` - Hashed password (for credentials auth)
- `name` - User display name
- `provider` - Auth provider (credentials, google, etc.)
- `providerId` - Provider-specific user ID
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

#### Project
- `id` - Unique identifier
- `name` - Project name
- `originalBaseUrl` - Original API base URL
- `proxyUrl` - Generated proxy URL
- `userId` - Owner user ID
- `createdAt` - Project creation timestamp

#### ApiRequestLog
- `id` - Unique identifier
- `projectId` - Associated project ID
- `method` - HTTP method
- `path` - Request path
- `requestHeaders` - Request headers (JSON)
- `requestBody` - Request body (JSON)
- `queryParams` - Query parameters (JSON)
- `responseHeaders` - Response headers (JSON)
- `responseBody` - Response body (JSON)
- `responseCode` - HTTP status code
- `durationMs` - Request duration in milliseconds
- `ipAddress` - Client IP address
- `userAgent` - Client user agent
- `city` - Client city
- `country` - Client country
- `securityScore` - Security score (0-100)
- `securityIssues` - Security issues array (JSON)
- `requestSize` - Request size in bytes
- `responseSize` - Response size in bytes
- `createdAt` - Request timestamp

#### AnalyticsAggregation
- `id` - Unique identifier
- `projectId` - Associated project ID
- `date` - Aggregation date
- `hour` - Hour of day (null for daily aggregations)
- `requestCount` - Total requests
- `avgResponseTime` - Average response time
- `errorRate` - Error rate percentage
- `totalRequests` - Total request count
- `totalErrors` - Total error count

## 🔧 Development

### Project Structure
```
src/
├── api/                 # API routes
│   ├── routes/         # Route definitions
│   └── index.ts        # Main API router
├── config/             # Configuration files
├── controllers/         # Request handlers
├── middleware/         # Express middleware
├── services/           # Business logic services
└── types/              # TypeScript type definitions
```

### Key Services

#### Proxy Service
- Handles request proxying
- Performs security analysis
- Updates analytics aggregations
- Background processing for performance

#### Analytics Service
- Pre-computes metrics for performance
- Handles hourly and daily aggregations
- Optimizes query performance

#### Security Service
- Analyzes requests for security issues
- Generates security scores
- Detects potential vulnerabilities

### Database Operations

#### Prisma Commands
```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration-name

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Input Validation** - Comprehensive request validation
- **SQL Injection Protection** - Prisma ORM protection
- **CORS Configuration** - Cross-origin request handling
- **Security Analysis** - Automatic security issue detection

## 📊 Performance Optimizations

- **Analytics Aggregation** - Pre-computed metrics reduce query time
- **Background Processing** - Non-blocking request processing
- **Database Indexing** - Optimized queries with proper indexing
- **Pagination** - Efficient data retrieval
- **Connection Pooling** - Database connection optimization

## 🚀 Deployment

### Environment Variables
```env
JWT_SECRET=your-jwt-secret-key
INTERNAL_API_KEY=your-internal-api-key
DATABASE_URL="file:./prisma/dev.db"
NODE_ENV=production
PORT=8080
```

### Production Considerations
- Use PostgreSQL or MySQL for production database
- Implement proper logging and monitoring
- Set up reverse proxy (nginx)
- Configure SSL/TLS certificates
- Implement rate limiting
- Set up backup strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🏆 Hackathon Context

This backend was built for the Treblle Hackathon, focusing on:
- Real-time API monitoring
- Security analysis and scoring
- Comprehensive analytics and reporting
- User-friendly project management
- Scalable architecture for future growth

---

**Built with ❤️ for the Treblle Hackathon**
