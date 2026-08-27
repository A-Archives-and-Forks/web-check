import { Fragment } from 'react';
import { faXTwitter, faBluesky, faGithub, faMastodon } from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Card } from 'client/components/Form/Card';
import Row from 'client/components/Form/Row';
import Heading from 'client/components/Form/Heading';
import colors from 'client/styles/colors';

const cardStyles = `
  .network {
    gap: 0.5rem;
  }
  .network svg {
    width: 1rem;
    height: 1rem;
  }
  img.avatar {
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 50%;
    vertical-align: text-bottom;
    margin-right: 0.35rem;
  }
`;

const ICONS: Record<string, IconDefinition> = {
  X: faXTwitter,
  Bluesky: faBluesky,
  GitHub: faGithub,
  Mastodon: faMastodon,
};

const LABELS: Record<string, string> = { X: 'X (Twitter)' };

const BrandIcon = ({ network }: { network: string }): JSX.Element | null => {
  const icon = ICONS[network];
  if (!icon) return null;
  const [width, height, , , path] = icon.icon;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} fill="currentColor" aria-hidden="true">
      <path d={Array.isArray(path) ? path.join(' ') : path} />
    </svg>
  );
};

const status = (profile: any): string => {
  if (profile.checked === false) return '⚠️ Could not be checked';
  if (!profile.exists) return '❌ No such account';
  if (profile.domainVerified) return '✅ Handle is this domain';
  if (profile.linksBack) {
    return profile.websiteVerified ? '✅ Links back, network verified' : '✅ Links back';
  }
  return profile.website ? '⚠️ Links to another site' : '⚠️ No website listed';
};

const num = (value: any): string =>
  typeof value === 'number' ? value.toLocaleString() : String(value);

const SocialPresenceCard = (props: {
  data: any;
  title: string;
  actionButtons: any;
}): JSX.Element => {
  const profiles: any[] = props.data || [];
  return (
    <Card heading={props.title} actionButtons={props.actionButtons} styles={cardStyles}>
      {profiles.map((profile) => (
        <Fragment key={`${profile.network}-${profile.handle}`}>
          <Heading className="network" as="h4" align="left" color={colors.primary} size="small">
            <BrandIcon network={profile.network} />
            {LABELS[profile.network] || profile.network}
          </Heading>
          <Row lbl="" val="">
            <span className="lbl">Handle</span>
            <span className="val">
              <a target="_blank" rel="noreferrer" href={profile.url}>
                {profile.avatar && <img className="avatar" src={profile.avatar} alt="" />}@
                {profile.handle}
              </a>
            </span>
          </Row>
          {profile.name && <Row lbl="Name" val={profile.name} />}
          {profile.joined && <Row lbl="Joined" val={profile.joined} />}
          {profile.count !== undefined && (
            <Row
              lbl={profile.network === 'GitHub' ? 'Repositories' : 'Posts'}
              val={num(profile.count)}
            />
          )}
          {profile.followers !== undefined && <Row lbl="Followers" val={num(profile.followers)} />}
          {profile.website && !profile.linksBack && <Row lbl="Website" val={profile.website} />}
          <Row lbl="Verification" val={status(profile)} />
        </Fragment>
      ))}
    </Card>
  );
};

export default SocialPresenceCard;
