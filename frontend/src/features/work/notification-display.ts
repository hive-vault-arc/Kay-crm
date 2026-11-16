import { BirthdayIcon, CalendarIcon, ClockIcon, EmailIcon, FileIcon, FlagIcon, PhoneIcon, RefreshIcon, TaskIcon } from "@/components/icons";
import type { NotificationPage } from "./notification-feed";

const types = {
  birthday: { Icon: BirthdayIcon, label: "Anniversaire" },
  holiday: { Icon: FlagIcon, label: "Jour férié" },
  visit: { Icon: CalendarIcon, label: "Rappel de visite" },
  visitReport: { Icon: FileIcon, label: "Compte rendu de visite" },
  callback: { Icon: PhoneIcon, label: "Appel à faire" },
  followUp: { Icon: RefreshIcon, label: "Relance" },
  email: { Icon: EmailIcon, label: "E-mail à préparer" },
  reminder: { Icon: ClockIcon, label: "Rappel" },
  task: { Icon: TaskIcon, label: "Tâche" },
};

export function notificationType(item: NotificationPage["items"][number]) {
  switch (item.kind) {
    case "contact.birthday.eve":
    case "contact.birthday.today": return types.birthday;
    case "holiday.eve":
    case "holiday.today": return types.holiday;
    case "visit.reminder.day":
    case "visit.reminder.hour": return types.visit;
    case "visit.follow_up": return types.visitReport;
    case "task.reminder.day":
    case "task.reminder.hour":
    case "task.due": {
      // The task notification contract uses the same kinds for every task action.
      const action = item.context.trim();
      if (/^(?:appel|appeler|rappeler|rappel téléphonique|call back|callback)(?=$|[\s:·–-])/i.test(action)) return types.callback;
      if (/^(?:relance|relancer|suivi|follow[ -]up)(?=$|[\s:·–-])/i.test(action)) return types.followUp;
      if (/^(?:préparer un e-mail|e-mail|envoyer un e-mail)(?=$|[\s:·–-])/i.test(action)) return types.email;
      return item.title === "Rappel prévu : J-1" || item.title === "Rappel prévu : H-1" || item.title === "Rappel à traiter" ? types.reminder : types.task;
    }
  }
}
