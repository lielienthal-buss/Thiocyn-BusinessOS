import Turnstile from 'react-turnstile';

export function CaptchaComponent({
  onVerify,
}: {
  onVerify: (token: string) => void;
}) {
  return (
    <Turnstile
      sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
      onSuccess={(token) => {
        console.log('Captcha success:', token);
        onVerify(token);
      }}
    />
  );
}

export default CaptchaComponent;
