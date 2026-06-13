"use client";

import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import type { Person } from "@/types/person";

interface Props {
  person: Person;
}

export function PersonCard({ person }: Props) {
  return (
    <Link
      href={`/people/${person.slug}`}
      className="group overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md"
    >
      <div className="relative aspect-2/3 bg-muted">
        {person.profileUrl ? (
          <Image
            src={person.profileUrl}
            alt={person.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <User className="size-10" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-medium">{person.name}</h3>
        {person.knownForDepartment && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {person.knownForDepartment}
          </p>
        )}
      </div>
    </Link>
  );
}
