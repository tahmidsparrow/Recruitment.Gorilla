import { useState, type InputHTMLAttributes } from 'react';
import { Form } from 'react-bootstrap';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Plain input attributes rather than react-bootstrap's `FormControlProps`.
 * `Form.Control` is generic over its `as` element, so deriving props from it
 * widens `onChange`'s event to `any` at every call site — losing `e.target.value`
 * typing in exactly the place it matters. `size` is re-declared because the
 * HTML attribute is a number and Bootstrap's is a variant name.
 */
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'value'> & {
  size?: 'sm' | 'lg';
  isInvalid?: boolean;
  /** Narrower than the DOM attribute, which also allows `readonly string[]`
   *  (for `<select multiple>`) — a shape `Form.Control` does not accept. */
  value?: string | number;
};

/**
 * A password field with a show/hide control.
 *
 * One component rather than the toggle repeated at each call site — there are
 * five password inputs across sign-in, change-password and the SMTP settings,
 * and they should all reveal the same way.
 *
 * Notes on the details:
 * - The button is `type="button"`. Inside a `<form>` a button defaults to
 *   `submit`, so without this, revealing your password would submit the form.
 * - It is a real focusable button with `aria-pressed`, not a decorative icon,
 *   so it is reachable and its state is announced.
 * - Revealed state is deliberately local and resets on unmount: it should not
 *   persist across visits to a sign-in screen.
 */
export default function PasswordInput({ className = '', ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Hide password' : 'Show password';

  return (
    <div className="password-field">
      <Form.Control {...props} type={visible ? 'text' : 'password'} className={className} />
      <button
        type="button"
        className="password-field__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
      >
        {visible ? (
          <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Eye size={16} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
