"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COUNTRIES } from "../data/countries";

interface CountryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function CountryCombobox({ value, onChange, error }: CountryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedCountry = COUNTRIES.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            error && "border-red-500"
          )}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-lg leading-none">{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
              <span className="text-muted-foreground">{selectedCountry.dialCode}</span>
            </span>
          ) : (
            "Select country..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup heading="ALL COUNTRY">
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code} ${country.dialCode}`}
                  onSelect={() => {
                    onChange(country.code);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <span className="flex items-center gap-2 flex-1">
                    <span className="text-lg leading-none">{country.flag}</span>
                    <span>{country.name}</span>
                    <span className="text-muted-foreground">{country.dialCode}</span>
                  </span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
