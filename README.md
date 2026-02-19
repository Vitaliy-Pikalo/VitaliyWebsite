# Vitaliy Pikalo Portfolio Website

A modern, high-performance personal portfolio website built with Next.js, TypeScript, Tailwind CSS, and Framer Motion.

## Features

- **Modern Design**: Dark minimal background with bold typography and subtle animations
- **Fully Responsive**: Optimized for all screen sizes
- **Smooth Animations**: Scroll-triggered animations using Framer Motion
- **Fast Loading**: Optimized for performance
- **Clean Architecture**: Well-organized component structure

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion**
- **React Icons**

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── layout.tsx       # Root layout with fonts
│   ├── page.tsx          # Main page component
│   └── globals.css       # Global styles
├── components/
│   ├── Navbar.tsx        # Sticky navigation bar
│   ├── Hero.tsx          # Hero section
│   ├── About.tsx         # About section
│   ├── Experience.tsx    # Experience section
│   ├── Projects.tsx      # Projects section
│   ├── HackathonProjects.tsx  # Hackathon projects
│   ├── Skills.tsx        # Skills section
│   ├── Certifications.tsx # Certifications section
│   ├── Achievements.tsx  # Achievements section
│   ├── Contact.tsx       # Contact section
│   └── TickerBackground.tsx # Animated background
└── ...
```

## Customization

All content is defined within the component files. Edit the respective component files to update:
- Personal information
- Projects and experience
- Skills and certifications
- Contact information

## License

MIT
