'use client';

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { ClipboardList, MessageSquare } from 'lucide-react';

import FinalRequestSection from '@/app/features/stringing-applications/components/apply-shared/FinalRequestSection';
import MountingInfoSection from '@/app/features/stringing-applications/components/apply-shared/MountingInfoSection';
import type useCheckoutStringingServiceAdapter from '@/app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter';

type SectionType = 'mounting' | 'final';
type CheckoutStringingServiceAdapter = ReturnType<typeof useCheckoutStringingServiceAdapter>;

type Props = {
  section: SectionType;
  withStringService: boolean;
  adapter: CheckoutStringingServiceAdapter;
};

export default function CheckoutStringingServiceSections({ section, withStringService, adapter }: Props) {
  if (!withStringService) return null;

  if (section === 'mounting') {
    return (
      <Card className="bg-card bp-lg:backdrop-blur-sm bp-lg:bg-card/80 bp-lg:dark:bg-card/80 border border-border bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
        <div className="bg-card p-4 bp-sm:p-6">
          <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
            <ClipboardList className="h-5 w-5 text-foreground" />
            장착 정보
          </CardTitle>
          <CardDescription className="mt-2">교체 서비스 라켓/스트링 정보를 확인하고 입력해주세요.</CardDescription>
        </div>
        <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
          <MountingInfoSection
            formData={adapter.formData}
            setFormData={adapter.setFormData}
            handleInputChange={adapter.handleInputChange}
            fromPDP={false}
            orderId={adapter.previewOrderId}
            rentalId={null}
            rentalRacketId={null}
            rentalDays={null}
            pdpProductId={null}
            isLoadingPdpProduct={false}
            pdpProduct={null}
            orderRemainingSlots={adapter.orderRemainingSlots}
            orderStringService={adapter.orderStringService}
            isOrderSlotBlocked={false}
            order={adapter.previewOrder}
            lineCount={adapter.lineCount}
            price={adapter.price}
            priceView={adapter.priceView}
            handleStringTypesChange={adapter.handleStringTypesChange}
            handleCustomInputChange={adapter.handleCustomInputChange}
            handleUseQtyChange={adapter.handleUseQtyChange}
            lockedStringStock={null}
            lockedRacketQuantity={null}
            maxNonOrderQty={adapter.maxNonOrderQty}
            selectedOrderItem={adapter.selectedOrderItem}
            isCombinedPdpMode={false}
            pdpStringPrice={0}
            racketPrice={null}
            won={(n) => `${n.toLocaleString('ko-KR')}원`}
            packagePreview={adapter.packagePreview}
            canApplyPackage={adapter.canApplyPackage}
            packageInsufficient={adapter.packageInsufficient}
            packageRemaining={adapter.packageRemaining}
            requiredPassCount={adapter.requiredPassCount}
            linesForSubmit={adapter.linesForSubmit}
            handleLineFieldChange={adapter.handleLineFieldChange}
            timeSlots={[]}
            disabledTimes={[]}
            slotsLoading={false}
            hasCacheForDate={false}
            slotsError={null}
            visitSlotCountUi={adapter.lineCount}
            visitDurationMinutesUi={null}
            visitTimeRange={adapter.visitTimeRange}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card bp-lg:backdrop-blur-sm bp-lg:bg-card/80 bp-lg:dark:bg-card/80 border border-border bp-lg:border-0 shadow-sm bp-lg:shadow-xl overflow-hidden">
      <div className="bg-card p-4 bp-sm:p-6">
        <CardTitle className="flex items-center gap-3 text-base bp-sm:text-lg">
          <MessageSquare className="h-5 w-5 text-foreground" />
          추가 요청
        </CardTitle>
        <CardDescription className="mt-2">교체 서비스 관련 요청사항을 남겨주세요.</CardDescription>
      </div>
      <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
        <FinalRequestSection
          formData={adapter.formData}
          setFormData={adapter.setFormData}
          handleInputChange={adapter.handleInputChange}
          orderId={adapter.previewOrderId}
          isMember={adapter.isMember}
          usingPackage={adapter.usingPackage}
          packageInsufficient={adapter.packageInsufficient}
          context="checkout"
        />
      </CardContent>
    </Card>
  );
}
