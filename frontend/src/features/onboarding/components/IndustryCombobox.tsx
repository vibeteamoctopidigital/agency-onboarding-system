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
import { INDUSTRIES } from "../data/industries";

interface IndustryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function IndustryCombobox({ value, onChange, error }: IndustryComboboxProps) {
  const [open, setOpen] = React.useState(false);

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
          {value ? value : "Select industry..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search industry..." />
          <CommandList>
            <CommandEmpty>No industry found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto">
              {INDUSTRIES.map((industry) => (
                <CommandItem
                  key={industry}
                  value={industry}
                  onSelect={(currentValue) => {
                    // CommandItem value is always lowercase in cmdk by default unless controlled
                    // We map back to original case by matching
                    const exactMatch = INDUSTRIES.find(i => i.toLowerCase() === currentValue) || industry;
                    onChange(exactMatch);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <span className="flex-1">{industry}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === industry ? "opacity-100" : "opacity-0"
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
