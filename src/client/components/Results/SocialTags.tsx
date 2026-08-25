import { Card } from 'client/components/Form/Card';
import Row from 'client/components/Form/Row';
import colors from 'client/styles/colors';

const cardStyles = `
  .banner-image img {
    width: 100%;
    border-radius: 4px;
    margin: 0.5rem 0;
  }
  .color-field {
    border-radius: 4px;
    &:hover {
      color: ${colors.primary};
    }
  }
  .x-avatar {
    width: 1.2rem;
    border-radius: 50%;
    vertical-align: text-bottom;
    margin-right: 0.25rem;
  }
`;

const OgBanner = ({ ogImage, ogUrl }: { ogImage: string; ogUrl?: string }): JSX.Element => {
  const urlCover = ogImage.startsWith('/') && ogUrl ? `${ogUrl}${ogImage}` : ogImage;
  return (
    <div className="banner-image">
      <img src={urlCover} alt="Banner" />
    </div>
  );
};

const SocialTagsCard = (props: { data: any; title: string; actionButtons: any }): JSX.Element => {
  const tags = props.data;
  const xProfile = tags.xProfile;
  const xHandle = xProfile?.handle || tags.xHandle;
  return (
    <Card heading={props.title} actionButtons={props.actionButtons} styles={cardStyles}>
      {tags.title && <Row lbl="Title" val={tags.title} />}
      {tags.description && <Row lbl="Description" val={tags.description} />}
      {tags.keywords && <Row lbl="Keywords" val={tags.keywords} />}
      {tags.canonicalUrl && <Row lbl="Canonical URL" val={tags.canonicalUrl} />}
      {tags.themeColor && (
        <Row lbl="" val="">
          <span className="lbl">Theme Color</span>
          <span className="val color-field" style={{ background: tags.themeColor }}>
            {tags.themeColor}
          </span>
        </Row>
      )}
      {tags.twitterSite && (
        <Row lbl="" val="">
          <span className="lbl">X Profile</span>
          <span className="val">
            {xHandle ? (
              <a target="_blank" rel="noreferrer" href={`https://x.com/${xHandle}`}>
                {xProfile?.avatar && <img className="x-avatar" src={xProfile.avatar} alt="" />}@
                {xHandle}
              </a>
            ) : (
              tags.twitterSite
            )}
          </span>
        </Row>
      )}
      {xProfile?.exists === false && <Row lbl="X Account" val="❌ No such account" />}
      {xProfile?.name && <Row lbl="X Name" val={xProfile.name} />}
      {xProfile?.joined && <Row lbl="X Joined" val={xProfile.joined} />}
      {xProfile?.posts && <Row lbl="X Posts" val={xProfile.posts} />}
      {xProfile?.website && (
        <Row
          lbl="X Links Back"
          val={xProfile.linksBack ? '✅ Yes' : `❌ No (${xProfile.website})`}
        />
      )}
      {tags.author && <Row lbl="Author" val={tags.author} />}
      {tags.publisher && <Row lbl="Publisher" val={tags.publisher} />}
      {tags.generator && <Row lbl="Generator" val={tags.generator} />}
      {tags.ogImage && <OgBanner ogImage={tags.ogImage} ogUrl={tags.ogUrl} />}
    </Card>
  );
};

export default SocialTagsCard;
