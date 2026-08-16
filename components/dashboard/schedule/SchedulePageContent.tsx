"use client";

import { useState } from "react";
import ScheduleLayout, { type Section } from "./ScheduleLayout";
import ScheduleConfig from "./ScheduleConfig";
import RequestsList from "./RequestsList";
import type {
  AvailabilityException,
  AvailabilityRule,
  Booking,
  ScheduleEvent,
} from "@/types/schedule";

interface SchedulePageContentProps {
  profileId: string;
  initialEvent: ScheduleEvent;
  initialRules: AvailabilityRule[];
  initialExceptions: AvailabilityException[];
  googleEmail: string | null;
  bookings: Booking[];
}

export default function SchedulePageContent({
  profileId,
  initialEvent,
  initialRules,
  initialExceptions,
  googleEmail,
  bookings,
}: SchedulePageContentProps) {
  const [activeSection, setActiveSection] = useState<Section>("config");

  return (
    <ScheduleLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      <ScheduleConfig
        profileId={profileId}
        initialEvent={initialEvent}
        initialRules={initialRules}
        initialExceptions={initialExceptions}
        googleEmail={googleEmail}
        activeSection={activeSection}
      />
      <RequestsList
        bookings={bookings}
        eventTitle={initialEvent.title}
        activeSection={activeSection}
      />
    </ScheduleLayout>
  );
}
