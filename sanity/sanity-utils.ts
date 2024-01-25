import { Page } from '@/src/lib/types/Page';
import { createClient, groq } from 'next-sanity';

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.VERCEL_ENV === 'production' ? 'production' : 'sandbox',
  apiVersion: '2024-01-25',
  useCdn: false,
});

export async function getHomePage() {
  return client.fetch(
    groq`*[_type == "homePage"]{
            title,
            subtitle,
            spanTitle,
            headerImage,
            oneLiner,
            oneLinerDescription,
            features[]{
              featureTitle,
              featureDescription,
              featureImage,
            },
            howItWorks[]{
              title,
              description,
              image,
            },
            faq[]{
              question,
              answer,
            },
            ctaTitle,
            ctaDescription,
        }`
  );
}

export async function getAboutPage() {
  return client.fetch(
    groq`*[_type == "aboutPage"]{
            title,
            subheadingOne,
            mainImage,

            paragraphOne,
            subheadingTwo,
            paragraphTwo,
            subheadingThree,
            paragraphThree,

            teamMembers[]{
              name,
              role,
              image,
            },

        }`
  );
}

export async function getFeaturesPage() {
  return client.fetch(
    groq`*[_type == "featuresPage"] {
  title,
  SubTitle,
  SubheadingOne,
  SubheadingOneA,
  "howItWorksSteps": howItWorks[] {
    stepTitle,
    stepDescription
  },
  SubheadingTwo,
  "featuresList": features[] {
    featureTitle,
    featureDescription
  },
  SubheadingThree,
  "useCasesList": useCases[] {
    useCaseTitle,
    useCaseDescription
  }
}
`
  );
}

export async function getPages(): Promise<Page[]> {
  return client.fetch(
    groq`*[_type == "page"]{
            _id,
            _createdAt,
            title,
            "slug": slug.current,
        }`
  );
}
