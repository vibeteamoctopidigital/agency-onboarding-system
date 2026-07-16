"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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

interface CityComboboxProps {
  countryCode: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

// Simulated API function
const searchCities = async (query: string, countryCode: string) => {
  return new Promise<string[]>((resolve) => {
    setTimeout(() => {
      // Mock data based on country
      const mockCities: Record<string, string[]> = {
        US: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"],
        GB: ["London", "Manchester", "Birmingham", "Liverpool", "Edinburgh"],
        CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
        CN: ["Beijing", "Shanghai", "Shenzhen", "Guangzhou", "Chengdu"],
        IN: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai"],
      };

      let results = mockCities[countryCode] || ["Capital City", "Major City 1", "Major City 2"];
      
      if (query) {
        results = results.filter(city => city.toLowerCase().includes(query.toLowerCase()));
      }
      
      resolve(results);
    }, 600); // Simulate network delay
  });
};

export function CityCombobox({ countryCode, value, onChange, error }: CityComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [cities, setCities] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    if (open) {
      setLoading(true);
      searchCities(search, countryCode).then((results) => {
        if (active) {
          setCities(results);
          setLoading(false);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [open, search, countryCode]);

  React.useEffect(() => {
    // Reset city if country changes
    if (value && countryCode) {
      // onChange(""); // Removed this to prevent infinite loops or premature clearing if the user is just typing. 
      // Typically we'd handle clearing in the parent form.
    }
  }, [countryCode]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={!countryCode}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            error && "border-red-500"
          )}
        >
          {value ? value : countryCode ? "Select city..." : "Select country first"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search city..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading cities...
              </div>
            ) : (
              <>
                <CommandEmpty>No city found.</CommandEmpty>
                <CommandGroup>
                  {cities.map((city) => (
                    <CommandItem
                      key={city}
                      value={city}
                      onSelect={() => {
                        onChange(city);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <span>{city}</span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === city ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
