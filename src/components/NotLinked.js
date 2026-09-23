import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";

/**
 * Shown when a customer is signed in but no customers row points at their
 * login. Nothing on this panel can be answered in that state — there is no
 * milk round to read — so each page says so plainly instead of rendering
 * empty tables that look like a customer with no deliveries.
 */
export default function NotLinked() {
  return (
    <Alert severity="info">
      <AlertTitle>Tamaru account hju dairy sathe jodayu nathi</AlertTitle>
      Tamaru login to chalu chhe, pan dairy na chopde tamaru khatu hju jodayu
      nathi — etle dudh ke hisab ahi dekhay nahi. Dairy no sampark karo, eo ek j
      click ma jodi aapse.
    </Alert>
  );
}
