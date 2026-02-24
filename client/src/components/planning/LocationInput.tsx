import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface LocationInputProps {
  address: string;
  postcode: string;
  houseNumber?: string;
  onAddressChange: (value: string) => void;
  onPostcodeChange: (value: string) => void;
  onHouseNumberChange?: (value: string) => void;
  showHouseNumber?: boolean;
}

export function LocationInput({
  address,
  postcode,
  houseNumber = "",
  onAddressChange,
  onPostcodeChange,
  onHouseNumberChange,
  showHouseNumber = false,
}: LocationInputProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <MapPin className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Property Location</h3>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${showHouseNumber ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        {showHouseNumber && (
          <div className="space-y-2">
            <Label htmlFor="houseNumber">
              House No. <span className="text-red-500">*</span>
            </Label>
            <Input
              id="houseNumber"
              placeholder="e.g. 42"
              value={houseNumber}
              onChange={(e) => onHouseNumberChange?.(e.target.value)}
              className="bg-card border-white/10 h-12"
            />
          </div>
        )}

        <div className={`space-y-2 ${showHouseNumber ? "md:col-span-2" : "md:col-span-2"}`}>
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            placeholder="e.g. High Street, London"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            className="bg-card border-white/10 h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postcode">
            Postcode <span className="text-red-500">*</span>
          </Label>
          <Input
            id="postcode"
            placeholder="e.g. SW1A 1AA"
            value={postcode}
            onChange={(e) => onPostcodeChange(e.target.value.toUpperCase())}
            className="bg-card border-white/10 h-12 uppercase"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Enter your property location to search for nearby planning approvals
      </p>
    </div>
  );
}
