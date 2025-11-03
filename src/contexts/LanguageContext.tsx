'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'nl';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys - English (default) and Dutch
const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.calendar': 'Calendar',
    'nav.films': 'Films',
    'nav.screenings': 'Screenings',
    'nav.availability': 'Availability',
    'nav.plan': 'Plan',
    'nav.swaps': 'Swaps',
    'nav.volunteers': 'Volunteers',
    'nav.settings': 'Settings',
    'nav.testEmail': 'Test Email',
    'nav.logout': 'Logout',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.close': 'Close',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.today': 'Today',
    'common.week': 'Week',
    'common.month': 'Month',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Overview of upcoming screenings and assignments',
    'dashboard.upcomingScreenings': 'Upcoming Screenings',
    'dashboard.completeAssignments': 'Complete Assignments',
    'dashboard.missingAssignments': 'Missing Assignments',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.runPlanner': 'Run Planner',
    'dashboard.exportICS': 'Export ICS',
    'dashboard.exportPDF': 'Export PDF',
    
    // Calendar
    'calendar.title': 'Calendar',
    'calendar.subtitle': 'View screenings and assignments in calendar format',
    'calendar.complete': 'Complete',
    'calendar.partial': 'Partial',
    'calendar.missing': 'Missing',
    'calendar.screeningDetails': 'Screening Details',
    'calendar.detailedInformation': 'Detailed information about the selected screening',
    'calendar.duration': 'Duration',
    'calendar.minutes': 'minutes',
    'calendar.volunteers': 'Volunteers',
    'calendar.noVolunteersAssigned': 'No volunteers assigned',
    'calendar.assignmentSummary': 'Assignment Summary',
    'calendar.nextScreenings': 'Next 10 screenings',
    'calendar.fullyStaffedScreenings': 'Fully staffed screenings',
    'calendar.needStaffing': 'Need staffing',
    'calendar.runPlannerForScreenings': 'Run the planner for upcoming screenings',
    'calendar.assignmentStatusForNextScreenings': 'Assignment status for next screenings',
    
    // Roles
    'role.admin': 'Admin',
    'role.programma': 'Programma',
    'role.techniek': 'Techniek',
    'role.zaalwacht': 'Zaalwacht',
    
    // Status
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.complete': 'Complete',
    'status.partial': 'Partial',
    'status.missing': 'Missing',
    
    // Language
    'language.english': 'English',
    'language.dutch': 'Dutch',
    'language.switch': 'Switch Language',
    
    // Login
    'login.title': 'Film Theater Planner',
    'login.subtitle': 'Sign in to manage your volunteer schedule',
    'login.signIn': 'Sign In',
    'login.emailPlaceholder': 'admin@filmtheater.nl',
    'login.passwordPlaceholder': 'Enter any password for demo',
    'login.signingIn': 'Signing in...',
    'login.demoAccounts': 'Demo accounts:',
    'login.volunteerEmails': 'Or use any volunteer email from the database:',
    'login.useAnyPassword': 'Use any password for demo purposes',
    
    // Settings
    'settings.title': 'Settings',
    'settings.menuLayout': 'Menu Layout',
    'settings.menuLayout.iconText': 'Icon + Text',
    'settings.menuLayout.iconTextBelow': 'Icon with Text Below',
    'settings.menuLayout.iconOnly': 'Icon Only',
    
    // Availability
    'availability.title': 'My Availability',
    'availability.subtitle': 'Mark your availability for upcoming screenings',
    'availability.grid': 'Availability Grid',
    'availability.toggleDescription': 'Toggle your availability for each screening',
    'availability.myRole': 'My Role:',
    'availability.film': 'Film',
    'availability.dateTime': 'Date & Time',
    'availability.location': 'Location',
    'availability.available': 'Available',
    'availability.legend': 'Availability Legend',
    'availability.quickActions': 'Quick Actions',
    'availability.markAllAvailable': 'Mark All Available',
    'availability.markAllUnavailable': 'Mark All Unavailable',
    'availability.sendRequest': 'Send Availability Request',
    'availability.emailTemplate': 'Email Template',
    'availability.sendToVolunteers': 'Send to {count} Volunteers',
    'availability.totalVolunteers': 'Total Volunteers',
    'availability.availabilityEntered': 'Availability Entered',
    'availability.pending': 'Pending',
    'availability.upcomingScreenings': 'Upcoming Screenings',
    'availability.volunteerStatus': 'Volunteer Availability Status',
    'availability.statusDescription': 'Overview of who has entered their availability and who still needs to',
    'availability.volunteer': 'Volunteer',
    'availability.email': 'Email',
    'availability.roles': 'Roles',
    'availability.status': 'Status',
    'availability.lastEntry': 'Last Entry',
    'availability.screenings': 'Screenings',
    'availability.actions': 'Actions',
    'availability.completed': 'Completed',
    'availability.never': 'Never',
    'availability.editAvailability': 'Edit Availability for {name}',
    'availability.editDescription': 'Manually set availability for this volunteer',
    'availability.activeVolunteers': 'Active volunteers',
    'availability.needToEnter': 'Need to enter availability',
    'availability.nextScreenings': 'Next 20 screenings',
    'availability.percentOfVolunteers': '{percent}% of volunteers',
    
    // Films
    'films.title': 'Films',
    'films.subtitle': 'Manage the film library',
    'films.addFilm': 'Add Film',
    'films.filmTitle': 'Film Title',
    'films.runtime': 'Runtime (minutes)',
    'films.notes': 'Notes',
    'films.actions': 'Actions',
    'films.edit': 'Edit',
    'films.delete': 'Delete',
    'films.archive': 'Archive',
    'films.restore': 'Restore',
    
    // Screenings
    'screenings.title': 'Screenings',
    'screenings.subtitle': 'Manage film screenings',
    'screenings.addScreening': 'Add Screening',
    'screenings.film': 'Film',
    'screenings.startTime': 'Start Time',
    'screenings.endTime': 'End Time',
    'screenings.location': 'Location',
    'screenings.notes': 'Notes',
    'screenings.actions': 'Actions',
    'screenings.edit': 'Edit',
    'screenings.delete': 'Delete',
    
    // Volunteers
    'volunteers.title': 'Volunteers',
    'volunteers.subtitle': 'Manage volunteer accounts',
    'volunteers.addVolunteer': 'Add Volunteer',
    'volunteers.name': 'Name',
    'volunteers.email': 'Email',
    'volunteers.roles': 'Roles',
    'volunteers.status': 'Status',
    'volunteers.actions': 'Actions',
    'volunteers.edit': 'Edit',
    'volunteers.deactivate': 'Deactivate',
    'volunteers.reactivate': 'Reactivate',
    'volunteers.makePermanent': 'Make Permanent',
    
    // Swaps
    'swaps.title': 'Swap Requests',
    'swaps.subtitle': 'Manage assignment swap requests',
    'swaps.requestSwap': 'Request Swap',
    'swaps.screening': 'Screening',
    'swaps.fromUser': 'From User',
    'swaps.toUser': 'To User',
    'swaps.role': 'Role',
    'swaps.status': 'Status',
    'swaps.actions': 'Actions',
    'swaps.accept': 'Accept',
    'swaps.reject': 'Reject',
    'swaps.cancel': 'Cancel',
    
    // Planner
    'planner.title': 'Planner',
    'planner.subtitle': 'Run automatic assignment planner',
    'planner.runPlanner': 'Run Planner',
    'planner.exportICS': 'Export ICS',
    'planner.exportPDF': 'Export PDF',
    'planner.results': 'Planner Results',
    'planner.assignments': 'Assignments',
    'planner.deficits': 'Deficits',
  },
  nl: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.calendar': 'Kalender',
    'nav.films': 'Films',
    'nav.screenings': 'Voorstellingen',
    'nav.availability': 'Beschikbaarheid',
    'nav.plan': 'Plannen',
    'nav.swaps': 'Wissels',
    'nav.volunteers': 'Vrijwilligers',
    'nav.settings': 'Instellingen',
    'nav.testEmail': 'Test Email',
    'nav.logout': 'Uitloggen',
    
    // Common
    'common.loading': 'Laden...',
    'common.save': 'Opslaan',
    'common.cancel': 'Annuleren',
    'common.delete': 'Verwijderen',
    'common.edit': 'Bewerken',
    'common.add': 'Toevoegen',
    'common.close': 'Sluiten',
    'common.yes': 'Ja',
    'common.no': 'Nee',
    'common.today': 'Vandaag',
    'common.week': 'Week',
    'common.month': 'Maand',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Overzicht van aankomende voorstellingen en taken',
    'dashboard.upcomingScreenings': 'Aankomende Voorstellingen',
    'dashboard.completeAssignments': 'Volledige Taken',
    'dashboard.missingAssignments': 'Ontbrekende Taken',
    'dashboard.quickActions': 'Snelle Acties',
    'dashboard.runPlanner': 'Planner Uitvoeren',
    'dashboard.exportICS': 'ICS Exporteren',
    'dashboard.exportPDF': 'PDF Exporteren',
    
    // Calendar
    'calendar.title': 'Kalender',
    'calendar.subtitle': 'Bekijk voorstellingen en taken in kalenderformaat',
    'calendar.complete': 'Volledig',
    'calendar.partial': 'Gedeeltelijk',
    'calendar.missing': 'Ontbrekend',
    'calendar.screeningDetails': 'Voorstelling Details',
    'calendar.detailedInformation': 'Gedetailleerde informatie over de geselecteerde voorstelling',
    'calendar.duration': 'Duur',
    'calendar.minutes': 'minuten',
    'calendar.volunteers': 'Vrijwilligers',
    'calendar.noVolunteersAssigned': 'Geen vrijwilligers toegewezen',
    'calendar.assignmentSummary': 'Taken Overzicht',
    'calendar.nextScreenings': 'Volgende 10 voorstellingen',
    'calendar.fullyStaffedScreenings': 'Volledig bemand',
    'calendar.needStaffing': 'Personeel nodig',
    'calendar.runPlannerForScreenings': 'Voer de planner uit voor aankomende voorstellingen',
    'calendar.assignmentStatusForNextScreenings': 'Taakstatus voor volgende voorstellingen',
    
    // Roles
    'role.admin': 'Beheerder',
    'role.programma': 'Programma',
    'role.techniek': 'Techniek',
    'role.zaalwacht': 'Zaalwacht',
    
    // Status
    'status.active': 'Actief',
    'status.inactive': 'Inactief',
    'status.complete': 'Volledig',
    'status.partial': 'Gedeeltelijk',
    'status.missing': 'Ontbrekend',
    
    // Language
    'language.english': 'Engels',
    'language.dutch': 'Nederlands',
    'language.switch': 'Taal Wisselen',
    
    // Login
    'login.title': 'Film Theater Planner',
    'login.subtitle': 'Log in om je vrijwilligersschema te beheren',
    'login.signIn': 'Inloggen',
    'login.emailPlaceholder': 'admin@filmtheater.nl',
    'login.passwordPlaceholder': 'Voer een wachtwoord in voor demo',
    'login.signingIn': 'Inloggen...',
    'login.demoAccounts': 'Demo accounts:',
    'login.volunteerEmails': 'Of gebruik een vrijwilliger email uit de database:',
    'login.useAnyPassword': 'Gebruik elk wachtwoord voor demo doeleinden',
    
    // Settings
    'settings.title': 'Instellingen',
    'settings.menuLayout': 'Menu Layout',
    'settings.menuLayout.iconText': 'Icoon + Tekst',
    'settings.menuLayout.iconTextBelow': 'Icoon met Tekst Onder',
    'settings.menuLayout.iconOnly': 'Alleen Icoon',
    
    // Availability
    'availability.title': 'Mijn Beschikbaarheid',
    'availability.subtitle': 'Geef je beschikbaarheid aan voor aankomende voorstellingen',
    'availability.grid': 'Beschikbaarheid Grid',
    'availability.toggleDescription': 'Schakel je beschikbaarheid in/uit voor elke voorstelling',
    'availability.myRole': 'Mijn Rol:',
    'availability.film': 'Film',
    'availability.dateTime': 'Datum & Tijd',
    'availability.location': 'Locatie',
    'availability.available': 'Beschikbaar',
    'availability.legend': 'Beschikbaarheid Legenda',
    'availability.quickActions': 'Snelle Acties',
    'availability.markAllAvailable': 'Alles Beschikbaar Maken',
    'availability.markAllUnavailable': 'Alles Onbeschikbaar Maken',
    'availability.sendRequest': 'Beschikbaarheid Verzoek Verzenden',
    'availability.emailTemplate': 'Email Template',
    'availability.sendToVolunteers': 'Verzenden naar {count} Vrijwilligers',
    'availability.totalVolunteers': 'Totaal Vrijwilligers',
    'availability.availabilityEntered': 'Beschikbaarheid Ingevoerd',
    'availability.pending': 'In Afwachting',
    'availability.upcomingScreenings': 'Aankomende Voorstellingen',
    'availability.volunteerStatus': 'Vrijwilliger Beschikbaarheid Status',
    'availability.statusDescription': 'Overzicht van wie hun beschikbaarheid heeft ingevoerd en wie nog moet',
    'availability.volunteer': 'Vrijwilliger',
    'availability.email': 'Email',
    'availability.roles': 'Rollen',
    'availability.status': 'Status',
    'availability.lastEntry': 'Laatste Invoer',
    'availability.screenings': 'Voorstellingen',
    'availability.actions': 'Acties',
    'availability.completed': 'Voltooid',
    'availability.never': 'Nooit',
    'availability.editAvailability': 'Bewerk Beschikbaarheid voor {name}',
    'availability.editDescription': 'Handmatig beschikbaarheid instellen voor deze vrijwilliger',
    'availability.activeVolunteers': 'Actieve vrijwilligers',
    'availability.needToEnter': 'Moeten beschikbaarheid invoeren',
    'availability.nextScreenings': 'Volgende 20 voorstellingen',
    'availability.percentOfVolunteers': '{percent}% van vrijwilligers',
    
    // Films
    'films.title': 'Films',
    'films.subtitle': 'Beheer de filmbibliotheek',
    'films.addFilm': 'Film Toevoegen',
    'films.filmTitle': 'Film Titel',
    'films.runtime': 'Speelduur (minuten)',
    'films.notes': 'Notities',
    'films.actions': 'Acties',
    'films.edit': 'Bewerken',
    'films.delete': 'Verwijderen',
    'films.archive': 'Archiveren',
    'films.restore': 'Herstellen',
    
    // Screenings
    'screenings.title': 'Voorstellingen',
    'screenings.subtitle': 'Beheer filmvoorstellingen',
    'screenings.addScreening': 'Voorstelling Toevoegen',
    'screenings.film': 'Film',
    'screenings.startTime': 'Starttijd',
    'screenings.endTime': 'Eindtijd',
    'screenings.location': 'Locatie',
    'screenings.notes': 'Notities',
    'screenings.actions': 'Acties',
    'screenings.edit': 'Bewerken',
    'screenings.delete': 'Verwijderen',
    
    // Volunteers
    'volunteers.title': 'Vrijwilligers',
    'volunteers.subtitle': 'Beheer vrijwilliger accounts',
    'volunteers.addVolunteer': 'Vrijwilliger Toevoegen',
    'volunteers.name': 'Naam',
    'volunteers.email': 'Email',
    'volunteers.roles': 'Rollen',
    'volunteers.status': 'Status',
    'volunteers.actions': 'Acties',
    'volunteers.edit': 'Bewerken',
    'volunteers.deactivate': 'Deactiveren',
    'volunteers.reactivate': 'Heractiveren',
    'volunteers.makePermanent': 'Permanent Maken',
    
    // Swaps
    'swaps.title': 'Wissel Verzoeken',
    'swaps.subtitle': 'Beheer taak wissel verzoeken',
    'swaps.requestSwap': 'Wissel Verzoeken',
    'swaps.screening': 'Voorstelling',
    'swaps.fromUser': 'Van Gebruiker',
    'swaps.toUser': 'Naar Gebruiker',
    'swaps.role': 'Rol',
    'swaps.status': 'Status',
    'swaps.actions': 'Acties',
    'swaps.accept': 'Accepteren',
    'swaps.reject': 'Afwijzen',
    'swaps.cancel': 'Annuleren',
    
    // Planner
    'planner.title': 'Planner',
    'planner.subtitle': 'Voer automatische taakplanner uit',
    'planner.runPlanner': 'Planner Uitvoeren',
    'planner.exportICS': 'ICS Exporteren',
    'planner.exportPDF': 'PDF Exporteren',
    'planner.results': 'Planner Resultaten',
    'planner.assignments': 'Taken',
    'planner.deficits': 'Tekorten',
  },
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'nl')) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    // Save language to localStorage when it changes
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
