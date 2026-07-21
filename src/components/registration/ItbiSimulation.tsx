import { Info } from "lucide-react";
import { useState } from "react";
import { formatCurrencyBRL, normalizeCurrencyInput, parseCurrencyBRL } from "../../lib/fgts/currency";
import { calculateSimplifiedItbi } from "../../lib/registration/simplifiedItbiCalculator";
import { getRegistrationCity } from "../../lib/registration/registrationCities";
import type { RegistrationCity, SimplifiedItbiResult } from "../../types/registration";
import { ItbiCitySelector } from "./ItbiCitySelector";
import { ItbiForm } from "./ItbiForm";
import { ItbiResult } from "./ItbiResult";
import { RegistrationDevelopmentState } from "./RegistrationDevelopmentState";

export function ItbiSimulation() {
  const [city, setCity] = useState<RegistrationCity | "">("");
  const [purchasePriceInput, setPurchasePriceInput] = useState("");
  const [result, setResult] = useState<SimplifiedItbiResult | null>(null);
  const [cityError, setCityError] = useState("");
  const [valueError, setValueError] = useState("");
  const [invalidInput, setInvalidInput] = useState(false);

  const selectedCity = city ? getRegistrationCity(city) : null;
  const inDevelopment = selectedCity?.availability === "IN_DEVELOPMENT";

  function selectCity(nextCity: RegistrationCity) {
    setCity(nextCity);
    setCityError("");
    setValueError("");
    setResult(null);
  }

  function changePurchasePrice(value: string) {
    const hasNegativeSign = value.includes("-");
    setInvalidInput(hasNegativeSign);
    setValueError(hasNegativeSign ? "Informe um valor válido." : "");
    setPurchasePriceInput(normalizeCurrencyInput(value));
    setResult(null);
  }

  function blurPurchasePrice() {
    const parsed = parseCurrencyBRL(purchasePriceInput);
    if (parsed > 0 && !invalidInput) setPurchasePriceInput(formatCurrencyBRL(parsed));
  }

  function calculate() {
    setCityError("");
    setValueError("");
    setResult(null);

    if (!city) {
      setCityError("Selecione uma cidade.");
      return;
    }
    if (!purchasePriceInput.trim()) {
      setValueError("Informe o valor de compra e venda.");
      return;
    }
    if (invalidInput) {
      setValueError("Informe um valor válido.");
      return;
    }

    const purchasePrice = parseCurrencyBRL(purchasePriceInput);
    if (purchasePrice <= 0) {
      setValueError("O valor de compra e venda precisa ser maior que zero.");
      return;
    }

    setPurchasePriceInput(formatCurrencyBRL(purchasePrice));
    setResult(calculateSimplifiedItbi({ city, purchasePrice }));
  }

  function clear() {
    setPurchasePriceInput("");
    setResult(null);
    setCityError("");
    setValueError("");
    setInvalidInput(false);
  }

  return (
    <div id="registration-itbi-panel" role="tabpanel" aria-labelledby="registration-tab-itbi" className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-600">Simulação simplificada</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl">Simulação Simplificada de ITBI</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Selecione a cidade e informe o valor de compra e venda do imóvel para obter uma estimativa.</p>
      </section>

      <ItbiCitySelector value={city} onChange={selectCity} error={cityError} />

      {inDevelopment && selectedCity ? (
        <RegistrationDevelopmentState kind="CITY" cityLabel={selectedCity.label} />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(330px,0.8fr)_minmax(0,1.2fr)]">
          <ItbiForm
            value={purchasePriceInput}
            error={valueError}
            onChange={changePurchasePrice}
            onBlur={blurPurchasePrice}
            onCalculate={calculate}
            onClear={clear}
          />
          <div aria-live="polite" aria-atomic="true">
            {result ? (
              <ItbiResult result={result} />
            ) : (
              <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
                <Info className="mx-auto h-6 w-6 text-goodblue-500" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-slate-900">Resultado da simulação</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Selecione uma cidade disponível, informe o valor e clique em Calcular.</p>
              </section>
            )}
          </div>
        </div>
      )}

      <section className="rounded-lg border border-goodblue-100 bg-goodblue-50 p-4 text-sm leading-6 text-goodblue-900">
        <strong>Importante:</strong> esta é uma simulação simplificada baseada exclusivamente no valor de compra e venda informado. O valor definitivo pode variar conforme a base reconhecida pelo município, o enquadramento da operação e a emissão da guia oficial.
      </section>
    </div>
  );
}
