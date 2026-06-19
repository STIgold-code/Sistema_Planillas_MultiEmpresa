import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import {
  OnboardingController,
  EmpleadosOnboardingController,
} from './onboarding.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [OnboardingController, EmpleadosOnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
