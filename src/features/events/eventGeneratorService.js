import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export const DAY_OF_WEEK_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export const DEFAULT_TEMPLATES = [
  {
    id: 'template_sunday_school',
    title: 'Sunday School',
    category: 'Sunday School',
    dayOfWeek: 'sunday',
    startTime: '08:30',
    endTime: '09:30',
    location: 'Church Sanctuary',
    visibility: 'public',
    attendanceEnabled: true,
    serveSchedulingEnabled: true,
    isActive: true,
  },
  {
    id: 'template_sunday_worship',
    title: 'Sunday Worship Service',
    category: 'Worship Service',
    dayOfWeek: 'sunday',
    startTime: '09:30',
    endTime: '11:45',
    location: 'Church Sanctuary',
    visibility: 'public',
    attendanceEnabled: true,
    serveSchedulingEnabled: true,
    isActive: true,
  },
  {
    id: 'template_wednesday_prayer',
    title: 'Wednesday Prayer Meeting',
    category: 'Prayer Meeting',
    dayOfWeek: 'wednesday',
    startTime: '18:30',
    endTime: '20:00',
    location: 'Church Sanctuary',
    visibility: 'members_only',
    attendanceEnabled: true,
    serveSchedulingEnabled: false,
    isActive: true,
  },
  {
    id: 'template_friday_bible_study',
    title: 'Friday Bible Study',
    category: 'Bible Study',
    dayOfWeek: 'friday',
    startTime: '18:30',
    endTime: '20:00',
    location: 'Church Sanctuary',
    visibility: 'members_only',
    attendanceEnabled: true,
    serveSchedulingEnabled: false,
    isActive: true,
  }
];

export function getDatesForDayOfWeek(year, month, dayOfWeekStr) {
  const dates = [];
  const targetDay = DAY_OF_WEEK_MAP[dayOfWeekStr.toLowerCase()];
  
  if (targetDay === undefined) return dates;

  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    if (date.getDay() === targetDay) {
      dates.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }
  
  return dates;
}

export function formatDateString(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function checkExistingEvents(churchId, year, month) {
  const q = query(
    collection(db, 'events'),
    where('churchId', '==', churchId)
  );
  
  const snapshot = await getDocs(q);
  const events = [];
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.date && data.date.startsWith(monthStr)) {
      events.push({ id: doc.id, ...data });
    }
  });
  
  return events;
}

export function generatePreview(year, month, templates, existingEvents) {
  const generatedEvents = [];
  
  templates.forEach(template => {
    if (!template.isActive) return;
    
    const dates = getDatesForDayOfWeek(year, month, template.dayOfWeek);
    
    dates.forEach(dateObj => {
      const dateStr = formatDateString(dateObj);
      
      const isDuplicate = existingEvents.some(e => 
        (e.templateId === template.id && e.date === dateStr) || 
        (e.title === template.title && e.date === dateStr && e.startTime === template.startTime)
      );
      
      generatedEvents.push({
        _previewId: `${template.id}_${dateStr}`,
        templateId: template.id,
        templateName: template.title,
        title: template.title,
        description: template.description || '',
        category: template.category,
        date: dateStr,
        startTime: template.startTime,
        endTime: template.endTime,
        location: template.location,
        visibility: template.visibility,
        enableAttendance: template.attendanceEnabled,
        enableVolunteer: template.serveSchedulingEnabled,
        enableRSVP: template.visibility !== 'leaders_only',
        isDuplicate,
        selected: !isDuplicate
      });
    });
  });
  
  generatedEvents.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });
  
  return generatedEvents;
}

export async function saveGeneratedEvents(eventsToSave, status, churchId, generatedMonth) {
  const batch = writeBatch(db);
  
  eventsToSave.forEach(event => {
    const docRef = doc(collection(db, 'events'));
    batch.set(docRef, {
      churchId,
      title: event.title,
      description: event.description || '',
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      category: event.category,
      status: status,
      enableAttendance: event.enableAttendance,
      enableVolunteer: event.enableVolunteer,
      enableRSVP: event.enableRSVP,
      source: 'template_generated',
      templateId: event.templateId,
      generatedMonth: generatedMonth,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
}
