import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';

export default {
  theme: {
    colors: {
      gray: colors.slate,
      blue: colors.teal,
      red: colors.rose,
      pink: colors.fuchsia,
    },
    fontFamily: {
      sans: ['Graphik', 'sans-serif'],
      serif: ['Merriweather', 'serif'],
    },
    extend: {
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      }
    }
  },
  variants: {
    extend: {
      borderColor: ['focus-visible'],
      opacity: ['disabled'],
    }
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.writing-v-lr': {
          'writing-mode': 'vertical-lr',
        },
        '.writing-v-rl': {
          'writing-mode': 'vertical-rl',
        },
        '.writing-h-tb': {
          'writing-mode': 'horizontal-tb',
        },
      })
    })
  ]
}