import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';

export const EmailTemplate = () => {
  return (
    <Html>
      <Head />
      <Preview>{`You're on the waitlist for ${process.env.NEXT_PUBLIC_SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text
              style={text}
            >{`Thank you for joining the waitlist for ${process.env.NEXT_PUBLIC_SITE_NAME}!`}</Text>
            <Text style={text}>
              🚀 We are very excited to have you on board as we build a cutting-edge platform to
              help you automate and scale your Google marketing operations seamlessly.
            </Text>
            <Text style={text}>
              🛠️ Look out for new features and updates as we get closer to our official launch. We
              are committed to providing you with the tools you need to optimize your marketing
              strategy and drive success.
            </Text>
            <Text style={text}>Stay tuned for more, and thanks again for your support!</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  padding: '10px 0',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  padding: '45px',
};

const text = {
  fontSize: '16px',
  fontFamily:
    "'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif",
  fontWeight: '400',
  color: '#404040',
  lineHeight: '26px',
  // padding: "0 40px",
};
