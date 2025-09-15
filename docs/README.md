# VRAM Magic Documentation

Welcome to the comprehensive documentation for VRAM Magic, the GPU memory calculator for Large Language Model deployments.

## Documentation Overview

This documentation is organized into several guides catering to different user types and use cases:

### 📚 [User Guide](./user-guide/)

**For end users and LLM operators**

- Getting started with VRAM Magic
- Understanding VRAM calculations
- Component-by-component usage guide
- Best practices for GPU selection
- Troubleshooting common issues

### 👨‍💻 [Developer Guide](./developer-guide/)

**For developers and contributors**

- Project setup and installation
- Architecture and design patterns
- Component development workflow
- Testing strategies
- Contribution guidelines

### ⚡ [Performance Guide](./performance-guide/)

**For optimization and production deployment**

- Frontend performance optimization
- VRAM calculation efficiency
- Bundle optimization techniques
- Runtime performance monitoring
- Memory management strategies

### 🔧 [API Reference](./api/)

**For technical integration**

- Component APIs and props
- Service layer documentation
- Custom hooks reference
- Type definitions
- Utility functions

## Quick Navigation

### Getting Started

- [Installation Guide](./developer-guide/#quick-setup)
- [User Quick Start](./user-guide/#quick-start)
- [Component Stories (Storybook)](http://localhost:6006) - Interactive examples

### Key Features

- **Model Selection**: Choose from 50+ pre-configured LLM models
- **Workload Configuration**: Drag-and-drop interface with 5 workload slots
- **Real-time Simulation**: Time-based VRAM usage calculations
- **Interactive Charts**: Recharts-powered visualizations
- **GPU Recommendations**: Smart GPU selection based on VRAM requirements
- **Export Capabilities**: JSON, CSV, and PNG export options

### Architecture Highlights

- **React 18+** with TypeScript 5+ for type safety
- **Material UI 5+** for consistent, accessible design
- **Vite** for fast development and optimized builds
- **Vitest** for comprehensive testing
- **Storybook** for component documentation
- **React DnD** for intuitive drag-and-drop interfaces

## Documentation Features

### Interactive Examples

All components are documented with interactive Storybook stories:

```bash
npm run storybook
# Opens http://localhost:6006
```

### Code Examples

Every API and component includes practical code examples:

```typescript
// Example: Basic VRAM calculation
const calculator = new VRAMCalculator();
const results = await calculator.simulate(model, workloadSlots, config);

// Example: Component usage
<VRAMChart
  data={results.usagePoints}
  maxVRAM={results.maxVRAM}
  chartType="area"
  showTooltips={true}
/>
```

### Accessibility Focus

All documentation includes accessibility considerations:

- WCAG 2.1 AA compliance guidelines
- Keyboard navigation instructions
- Screen reader compatibility notes
- Color contrast specifications

## Project Structure

```
docs/
├── README.md                   # This file - documentation overview
├── user-guide/                 # End-user documentation
│   └── README.md               # Complete user guide
├── developer-guide/            # Developer documentation
│   └── README.md               # Setup, architecture, contributing
├── performance-guide/          # Performance optimization
│   └── README.md               # Optimization strategies
└── api/                        # Technical API reference
    └── README.md               # Complete API documentation
```

## Related Resources

### External Links

- **Storybook**: Interactive component examples and playground
- **GitHub Repository**: Source code and issue tracking
- **NPM Package**: Published package for integration
- **Demo Application**: Live demo deployment

### Internal References

- [Component Tests](../tests/): Comprehensive test suites
- [Type Definitions](../src/types/): TypeScript interfaces and enums
- [Example Models](../public/models/): Sample LLM configuration files
- [Utility Functions](../src/utils/): Helper functions and validators

## Getting Help

### For Users

1. **Check the [User Guide](./user-guide/)** for step-by-step instructions
2. **Browse [Storybook Examples](http://localhost:6006)** for interactive demos
3. **Review [FAQ Section](./user-guide/#troubleshooting)** for common issues

### For Developers

1. **Read the [Developer Guide](./developer-guide/)** for setup instructions
2. **Check [API Documentation](./api/)** for technical details
3. **Review [Performance Guide](./performance-guide/)** for optimization tips
4. **Browse existing [Issues](https://github.com/your-org/vram-magic/issues)** on GitHub

### Support Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Documentation**: Comprehensive guides and examples
- **Storybook**: Interactive component exploration

## Contributing to Documentation

We welcome contributions to improve our documentation! Here's how:

### Documentation Standards

- **Clear Structure**: Use consistent headings and navigation
- **Code Examples**: Include practical, working examples
- **Accessibility**: Consider all user types and abilities
- **Screenshots**: Visual guides for complex UI interactions
- **Up-to-date**: Keep examples current with latest code

### File Organization

```
docs/
├── images/                     # Screenshots and diagrams
├── examples/                   # Complete code examples
└── templates/                  # Documentation templates
```

### Contributing Process

1. **Fork the repository** and create a documentation branch
2. **Update relevant documentation** with your changes
3. **Test examples** to ensure they work correctly
4. **Submit a pull request** with clear description of changes
5. **Review process** ensures quality and consistency

## Version History

### Latest Release (v1.0.0)

- Complete VRAM calculation engine
- Six main React components with full accessibility
- Comprehensive Storybook documentation
- TypeScript strict mode compliance
- 90%+ test coverage with Vitest

### Development Roadmap

- **v1.1**: Enhanced model management and custom model support
- **v1.2**: Advanced simulation patterns and load testing
- **v1.3**: Team collaboration features and shared configurations
- **v2.0**: API service integration and cloud deployment options

## Best Practices

### Documentation Usage

1. **Start with User Guide** for general understanding
2. **Use Storybook** for component exploration
3. **Reference API docs** for technical integration
4. **Check Performance Guide** before production deployment

### Development Workflow

1. **Read Developer Guide** for setup and patterns
2. **Follow TDD approach** with comprehensive testing
3. **Use TypeScript strictly** for type safety
4. **Maintain accessibility** throughout development

### Production Deployment

1. **Review Performance Guide** for optimization
2. **Implement monitoring** for Core Web Vitals
3. **Test accessibility** with real users
4. **Monitor bundle sizes** and loading performance

## Feedback and Improvements

We continuously improve our documentation based on user feedback:

### What's Working Well

- Comprehensive API coverage
- Interactive Storybook examples
- Clear component organization
- Practical code examples

### Areas for Improvement

- More visual diagrams and flowcharts
- Video tutorials for complex workflows
- Multi-language support
- Mobile-optimized documentation

### How to Provide Feedback

- **GitHub Issues**: Report documentation bugs or gaps
- **Pull Requests**: Contribute improvements directly
- **Discussions**: Suggest enhancements and new content
- **User Testing**: Participate in documentation usability studies

---

**Last Updated**: 2025-09-16
**Documentation Version**: 1.0.0
**Application Version**: 1.0.0

For questions about this documentation, please open an issue or start a discussion on GitHub.
