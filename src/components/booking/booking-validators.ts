export function isPhoneValid(phone: string) {
  return /^(50|52|54|55|56|58)\d{7}$/.test(phone);
}

export function getBusinessHours(date?: Date) {
  if (!date) {
    return { open: 10, close: 22 }; // Default to Sun–Thu window until a date is chosen
  }
  const day = date.getDay(); // 0 = Sunday
  if (day === 5 || day === 6) {
    return { open: 10, close: 24 }; // Fri/Sat
  }
  return { open: 10, close: 22 }; // Sun–Thu
}

export function buildTimeSlots(date: Date | undefined, durationHours: number) {
  const { open, close } = getBusinessHours(date);
  const slots: string[] = [];
  for (let hour = open; hour + durationHours <= close; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
}
