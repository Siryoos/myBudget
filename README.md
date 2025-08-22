# SmartSave - Personal Finance Management Platform

A comprehensive personal finance website designed to encourage saving behavior through psychological nudges and intuitive UI/UX.

## 📚 Documentation

This project maintains comprehensive documentation organized in the `docs/` directory:

### 🚀 [Getting Started](docs/getting-started.md)
- Installation and setup instructions
- Prerequisites and requirements
- Quick start guide
- Development environment setup

### 🏗️ [Architecture Overview](docs/architecture.md)
- System architecture and design
- Technology stack details
- Database schema
- Component structure

### 🔧 [Backend Development](docs/backend-development.md)
- API development guide
- Database setup and management
- Authentication and security
- Testing and deployment

### 🎨 [Frontend Development](docs/frontend-development.md)
- Component development
- State management
- Styling and design system
- Internationalization

### 🐳 [Docker & Deployment](docs/docker-deployment.md)
- Docker setup and configuration
- Production deployment
- Environment configuration
- Monitoring and logging

### 📡 [API Reference](docs/api-reference.md)
- Complete API documentation
- Authentication methods
- Request/response examples
- Error handling

### 🧠 [Implementation Guides](docs/implementation-guides.md)
- Behavioral psychology features
- Translation system
- Security implementations
- Performance optimization

### 🔒 [Security & Best Practices](docs/security-best-practices.md)
- Security features
- Best practices
- Compliance requirements
- Testing strategies

## 🌟 Features

### Core Functionality
- **Dashboard**: Complete financial overview with savings progress, budget summary, and insights
- **Budget Planner**: Multiple budgeting methods (50/30/20, Pay Yourself First, Envelope System, etc.)
- **Savings Goals**: Goal setting wizard with progress tracking and automation
- **Transaction Management**: Comprehensive transaction history with analytics
- **Financial Education**: Interactive learning modules and personalized tips
- **Settings**: Comprehensive user preferences and regional customization

### Behavioral Design
- **Psychological Nudges**: Encourage positive financial behavior
- **Gamification**: Achievements, challenges, and progress celebrations
- **Automation**: Smart saving rules and round-up features
- **Insights**: Personalized recommendations based on spending patterns

### Technical Features
- **Responsive Design**: Mobile-first approach with touch-optimized interactions
- **Accessibility**: WCAG AA compliance with screen reader support
- **Internationalization**: Multi-language and regional customization support
- **Modern UI**: Beautiful design system with smooth animations

## 🔒 Security Setup (CRITICAL)

**⚠️ IMPORTANT: Before running this application, you MUST configure security settings:**

1. **Environment Configuration**
   ```bash
   # Copy the template and configure your secrets
   cp env.template .env.local
   
   # Edit .env.local with your actual values
   # NEVER commit .env.local to version control
   ```

2. **Required Security Variables**
   - `JWT_SECRET`: Generate a secure random string (minimum 32 characters)
   - `DB_PASSWORD`: Strong database password
   - `REDIS_PASSWORD`: Strong Redis password
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed domains

3. **Generate Secure Secrets**
   ```bash
   # Generate JWT secret
   openssl rand -base64 32
   
   # Generate database password
   openssl rand -base64 16
   ```

4. **Docker Security**
   - In production, remove all port exposures from docker-compose.yml
   - Use internal networking only
   - Implement proper secrets management

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn package manager
- Docker (for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smartsave-finance-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🎨 Design System

### Color Palette
- **Primary**: Trust Blue (#1E5A8D) - Reliability and security
- **Secondary**: Growth Green (#27AE60) - Progress and success
- **Accent**: Action Orange (#FF6B35) - Call-to-action elements
- **Neutral**: Comprehensive grayscale for backgrounds and text

### Typography
- **Primary Font**: Inter - Clean, modern, highly readable
- **Secondary Font**: Roboto - Versatile and friendly
- **Numeric Font**: Roboto Mono - Clear number display

### Components
- Rounded corners for modern feel
- Subtle shadows for depth
- Smooth animations for engagement
- Touch-friendly button sizes (44px minimum)

## 📱 Mobile Optimization

### Responsive Breakpoints
- **Mobile**: 375px and up
- **Tablet**: 768px and up
- **Desktop**: 1024px and up
- **Wide**: 1440px and up

### Touch Interactions
- Swipe to save functionality
- Pull to refresh
- Long press actions
- Gesture-based navigation

## 🌍 Regional Support

### Middle East
- Arabic language support
- RTL (Right-to-Left) layout
- Islamic banking features
- Cultural spending categories
- Currency support (SAR, AED, QAR)

### United States
- English and Spanish languages
- Student loan tracking
- 401k integration
- Credit score monitoring
- Tax planning features

### Europe
- GDPR compliance
- PSD2 integration
- Multiple currency support
- VAT handling
- Minimal social sharing

## ♿ Accessibility Features

- **WCAG AA Compliance**: Meets international accessibility standards
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Comprehensive ARIA labels and descriptions
- **High Contrast Mode**: Enhanced visibility options
- **Focus Indicators**: Clear visual focus states
- **Alternative Text**: Descriptive alt text for all images

## 🔐 Security & Privacy

- **Data Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Authentication**: Multi-factor authentication support
- **Compliance**: GDPR, PCI, and PSD2 compliant
- **Privacy Controls**: Granular privacy settings
- **Session Management**: Secure session handling

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Custom component library
- **Animations**: Framer Motion for smooth interactions

### State Management
- React hooks for local state
- Context API for global state
- Custom hooks for business logic

### Performance
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Caching**: Intelligent caching strategies
- **Bundle Analysis**: Optimized bundle sizes

## 📊 Analytics & Insights

- **User Behavior Tracking**: Anonymous usage analytics
- **Goal Conversion Tracking**: Success rate monitoring
- **Feature Usage Analytics**: Popular feature identification
- **Nudge Effectiveness**: A/B testing for behavioral features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain accessibility standards
- Write comprehensive tests
- Update documentation as needed
- Follow the established code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspiration from leading fintech applications
- Behavioral economics principles from academic research
- Accessibility guidelines from WCAG 2.1
- Open source community for excellent tools and libraries

---

**SmartSave** - Empowering users to build better financial habits through intelligent design and behavioral psychology.

> 📖 **Need more details?** Check out our comprehensive [documentation](docs/) for in-depth guides on every aspect of the project.
