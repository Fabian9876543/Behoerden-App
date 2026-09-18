import { Building2, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AuthorityLink, AuthorityLinkKind } from "@/lib/authorities/links";

const KIND_LABEL: Record<AuthorityLinkKind, string> = {
  stadtportal: "Deine Gemeinde",
  bundesweit: "Bundesweit",
  behoerdensuche: "Gemeinde nicht hinterlegt",
};

const KIND_VARIANT: Record<AuthorityLinkKind, "success" | "muted" | "warning"> = {
  stadtportal: "success",
  bundesweit: "muted",
  behoerdensuche: "warning",
};

/**
 * Links zur zuständigen Stelle.
 *
 * Jeder Link sagt dazu, woher er kommt. Ein Stadtportal aus dem Katalog ist
 * etwas anderes als die bundesweite Behördensuche, die nur den Weg zur
 * eigenen Gemeinde zeigt - und dieser Unterschied bleibt sichtbar.
 */
export function AuthorityLinks({
  links,
  className,
}: {
  links: AuthorityLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <ul className={className ?? "space-y-2"}>
      {links.map((link) => (
        <li key={`${link.kind}-${link.url}`} className="text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {link.kind === "behoerdensuche" ? (
              <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <Building2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              {link.label}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <Badge variant={KIND_VARIANT[link.kind]}>{KIND_LABEL[link.kind]}</Badge>
          </div>
          {link.hint ? (
            <p className="ml-5 mt-0.5 text-xs text-muted-foreground">{link.hint}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
