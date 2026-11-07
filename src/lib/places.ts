/** Countries offered in address forms. Nigeria first: it's where Closebuy operates today. */
export const COUNTRIES = [
  'Nigeria',
  'Ghana',
  'Benin',
  'Togo',
  'Cameroon',
  'Niger',
  'Kenya',
  'South Africa',
  'United Kingdom',
  'United States',
] as const;

export const DEFAULT_COUNTRY = 'Nigeria';

/** Lagos neighbourhoods people commonly give as their "city". */
const LAGOS_AREAS = [
  'Lagos', 'Ikeja', 'Lekki', 'Victoria Island', 'Ikoyi', 'Lagos Island', 'Yaba', 'Surulere', 'Ajah', 'Ikorodu',
  'Festac', 'Apapa', 'Oshodi', 'Mushin', 'Maryland', 'Gbagada', 'Ogba', 'Agege', 'Alimosho', 'Egbeda', 'Ikotun',
  'Isolo', 'Ojo', 'Ojota', 'Ketu', 'Magodo', 'Ilupeju', 'Anthony', 'Sangotedo', 'Badagry', 'Epe', 'Ebute Metta',
  'Onike', 'Akoka', 'Bariga', 'Shomolu', 'Ilasamaja', 'Amuwo Odofin', 'Satellite Town', 'Iyana Ipaja', 'Ipaja',
  'Ijora', 'Idumota', 'Oregun', 'Opebi', 'Allen', 'Ogudu', 'Ojodu', 'Berger', 'Chevron', 'Osapa', 'Agungi',
];

/** State capitals and other large Nigerian cities. */
const NIGERIAN_CITIES = [
  'Abuja', 'Ibadan', 'Port Harcourt', 'Kano', 'Benin City', 'Enugu', 'Abeokuta', 'Kaduna', 'Jos', 'Ilorin',
  'Owerri', 'Uyo', 'Calabar', 'Warri', 'Asaba', 'Onitsha', 'Aba', 'Awka', 'Akure', 'Osogbo', 'Ado-Ekiti',
  'Ota', 'Sagamu', 'Ijebu-Ode', 'Ife', 'Ogbomosho', 'Umuahia', 'Abakaliki', 'Makurdi', 'Lafia', 'Lokoja',
  'Minna', 'Sokoto', 'Katsina', 'Zaria', 'Bauchi', 'Gombe', 'Yola', 'Jalingo', 'Maiduguri', 'Damaturu',
  'Dutse', 'Birnin Kebbi', 'Gusau', 'Yenagoa', 'Nnewi', 'Sapele', 'Ikot Ekpene', 'Suleja', 'Gwarinpa',
  'Wuse', 'Garki', 'Maitama', 'Kubwa', 'Lugbe',
];

export const NIGERIA_CITY_SUGGESTIONS = Array.from(new Set([...LAGOS_AREAS, ...NIGERIAN_CITIES]));

export function citySuggestionsFor(country: string | undefined): string[] {
  return !country || country.trim().toLowerCase() === 'nigeria' ? NIGERIA_CITY_SUGGESTIONS : [];
}
