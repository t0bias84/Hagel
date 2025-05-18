import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      admin: {
        users: {
          title: 'User Management',
          role: 'Role',
          status: 'Status',
          actions: 'Actions',
          activate: 'Activate',
          deactivate: 'Deactivate',
          changeRole: 'Change Role',
          roles: {
            USER: 'User',
            ELDER: 'Elder',
            ADMIN: 'Admin'
          }
        }
      }
    }
  },
  sv: {
    translation: {
      admin: {
        users: {
          title: 'Användarhantering',
          role: 'Roll',
          status: 'Status',
          actions: 'Åtgärder',
          activate: 'Aktivera',
          deactivate: 'Inaktivera',
          changeRole: 'Ändra roll',
          roles: {
            USER: 'Användare',
            ELDER: 'Äldre',
            ADMIN: 'Admin'
          }
        }
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n; 