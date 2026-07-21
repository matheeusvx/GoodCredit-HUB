import type { RegistrationCity, RegistrationCityConfig } from "../../types/registration";

export const REGISTRATION_CITIES: RegistrationCityConfig[] = [
  { id: "SAO_BERNARDO_DO_CAMPO", label: "São Bernardo do Campo", availability: "AVAILABLE" },
  { id: "DIADEMA", label: "Diadema", availability: "AVAILABLE" },
  { id: "SANTO_ANDRE", label: "Santo André", availability: "IN_DEVELOPMENT" },
  { id: "SAO_PAULO", label: "São Paulo", availability: "IN_DEVELOPMENT" },
  { id: "GUARULHOS", label: "Guarulhos", availability: "IN_DEVELOPMENT" },
  { id: "MAUA", label: "Mauá", availability: "IN_DEVELOPMENT" }
];

export function getRegistrationCity(city: RegistrationCity): RegistrationCityConfig {
  return REGISTRATION_CITIES.find((item) => item.id === city) ?? REGISTRATION_CITIES[0];
}
