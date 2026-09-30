import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = {
  title: "学习档案",
  description: "30 秒完成本地学习档案：身份、称呼、学段与感兴趣的科目。数据只存本机。",
  robots: { index: false },
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
