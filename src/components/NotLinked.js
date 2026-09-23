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
      <AlertTitle>Your account is not linked to the dairy yet</AlertTitle>
      Your login works, but the dairy&rsquo;s records are not pointing at you
      yet — so no milk or billing shows here. Contact the dairy; they can link
      it in one click.
    </Alert>
  );
}
