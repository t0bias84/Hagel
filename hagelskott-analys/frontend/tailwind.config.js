/** @type {import('tailwindcss').Config} */
export default {
  // Gör att Tailwind kan växla till "dark mode" när du lägger en .dark-klass
  darkMode: ["class"],

  // Talar om för Tailwind var källfilerna ligger (justera vid behov)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],

  // Prefix: Om du vill ha unika prefix (ex. "tw-"), annars lämna tom
  prefix: "",

  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			dark: {
  				'50': '#E0C097',
  				'100': '#D4B48C',
  				'200': '#C8A881',
  				'300': '#BC9C76',
  				'400': '#B85C38',
  				'500': '#8E472B',
  				'600': '#5C3D2E',
  				'700': '#4A3126',
  				'800': '#382520',
  				'900': '#2D2424',
  				DEFAULT: '#2D2424',
  				secondary: '#5C3D2E',
  				accent: '#B85C38',
  				highlight: '#E0C097'
  			},
  			border: 'hsl(var(--border))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				hover: '#8E472B'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))',
  				hover: '#4A3126'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))',
  				hover: '#8E472B'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))',
  				dark: '#382520',
  				darkForeground: '#E0C097'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))',
  				dark: '#4A3126',
  				darkForeground: '#D4B48C'
  			},
  			badge: {
  				DEFAULT: '#B85C38',
  				foreground: '#E0C097',
  				muted: '#5C3D2E',
  				mutedForeground: '#E0C097'
  			},
  			discordBg: '#2c2f33',
  			discordSidebar: '#23272a',
  			discordText: '#ffffff',
  			discordPrimary: '#5865f2',
  			discordHover: '#40444b',
  			military: {
  				'50': '#f8faf8',
  				'100': '#eef2ee',
  				'200': '#d4dcd4',
  				'300': '#bac7ba',
  				'400': '#869a86',
  				'500': '#677167',
  				'600': '#5e675e',
  				'700': '#4e574e',
  				'800': '#363d36',
  				'900': '#202520'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },

  // Exempel på plugins
  plugins: [
    require('@tailwindcss/line-clamp'),
      require("tailwindcss-animate")
],
};
