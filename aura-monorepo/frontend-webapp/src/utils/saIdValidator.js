function isValidCalendarDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

export function validateSouthAfricanId(idNumber) {
  if (!idNumber) {
    return { isValid: false, error: 'Enter your 13-digit South African ID number.', details: null };
  }

  if (!/^\d{13}$/.test(idNumber)) {
    return { isValid: false, error: 'A South African ID number must contain exactly 13 digits.', details: null };
  }

  const yearPart = Number(idNumber.slice(0, 2));
  const month = Number(idNumber.slice(2, 4));
  const day = Number(idNumber.slice(4, 6));
  const currentYear = new Date().getFullYear();
  const currentTwoDigitYear = currentYear % 100;
  const year = yearPart <= currentTwoDigitYear
    ? Math.floor(currentYear / 100) * 100 + yearPart
    : (Math.floor(currentYear / 100) - 1) * 100 + yearPart;

  if (!isValidCalendarDate(year, month, day) || new Date(year, month - 1, day) > new Date()) {
    return { isValid: false, error: 'The date of birth in this ID number is not a valid date.', details: null };
  }

  const citizenshipCode = idNumber[10];
  if (citizenshipCode !== '0' && citizenshipCode !== '1') {
    return { isValid: false, error: 'The citizenship digit in this ID number must be 0 or 1.', details: null };
  }

  const firstTwelveDigits = idNumber.slice(0, 12);
  const oddPositionSum = firstTwelveDigits
    .split('')
    .filter((_, index) => index % 2 === 0)
    .reduce((sum, digit) => sum + Number(digit), 0);
  const doubledEvenPositionDigits = firstTwelveDigits
    .split('')
    .filter((_, index) => index % 2 === 1)
    .join('');
  const doubledEvenPositionSum = String(Number(doubledEvenPositionDigits) * 2)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
  const checksum = (10 - ((oddPositionSum + doubledEvenPositionSum) % 10)) % 10;

  if (checksum !== Number(idNumber[12])) {
    return { isValid: false, error: 'The ID number checksum is invalid. Check the number and try again.', details: null };
  }

  const genderSequence = Number(idNumber.slice(6, 10));
  const dob = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

  return {
    isValid: true,
    error: null,
    details: {
      dob,
      gender: genderSequence >= 5000 ? 'Male' : 'Female',
      citizen: citizenshipCode === '0',
    },
  };
}
