import type { SVGProps } from 'react'

export interface IconAssetProps extends SVGProps<SVGSVGElement> {
  className?: string
}

export function DashboardButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
      viewBox="0 0 25 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M8.48486 12.917H3.59848C2.16338 12.917 1 14.0804 1 15.5155V20.4018C1 21.8369 2.16338 23.0003 3.59848 23.0003H8.48486C9.91996 23.0003 11.0833 21.8369 11.0833 20.4018V15.5155C11.0833 14.0804 9.91996 12.917 8.48486 12.917Z"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.3182 9.25H16.4319C14.9968 9.25 13.8334 10.4372 13.8334 11.9017V20.3483C13.8334 21.8128 14.9968 23 16.4319 23H21.3182C22.7533 23 23.9167 21.8128 23.9167 20.3483V11.9017C23.9167 10.4372 22.7533 9.25 21.3182 9.25Z"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.0377 1H15.7124C14.6746 1 13.8334 1.90289 13.8334 3.01667V5.4C13.8334 6.51377 14.6746 7.41667 15.7124 7.41667H22.0377C23.0755 7.41667 23.9167 6.51377 23.9167 5.4V3.01667C23.9167 1.90289 23.0755 1 22.0377 1Z"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.20436 1H2.87898C1.84125 1 1 1.80922 1 2.80744V8.35923C1 9.35745 1.84125 10.1667 2.87898 10.1667H9.20436C10.2421 10.1667 11.0833 9.35745 11.0833 8.35923V2.80744C11.0833 1.80922 10.2421 1 9.20436 1Z"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SettingsButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M19.7192 15.4037L19.7277 15.3952C20.0179 14.9898 19.9197 14.4266 19.5101 14.1408L19.045 13.8079C18.8701 13.6842 18.789 13.4623 18.853 13.2533C18.9938 12.7796 19.0962 12.289 19.156 11.7897C19.1816 11.5679 19.348 11.3887 19.5699 11.3503L20.2483 11.235C20.739 11.1497 21.0718 10.6846 20.9864 10.1897L20.7688 8.91817L20.628 8.09894C20.5427 7.61252 20.0776 7.28398 19.5912 7.36932L19.2114 7.43332C18.9896 7.47172 18.772 7.36078 18.6738 7.16024C18.4093 6.61409 18.0893 6.10634 17.7181 5.64125C17.5773 5.46632 17.573 5.22311 17.701 5.03963L17.9485 4.68976C18.2343 4.28441 18.1362 3.72972 17.7351 3.44811L15.9303 2.1766C15.5249 1.88646 14.9617 1.98459 14.6758 2.39421L14.4369 2.73555C14.3046 2.92329 14.0742 3.0001 13.8609 2.92756C13.3019 2.73555 12.7216 2.60328 12.12 2.53501C12.0091 2.52221 11.9109 2.47528 11.8341 2.40274C11.7531 2.33021 11.7019 2.23207 11.6805 2.12113C11.5525 1.38297 10.857 0.892293 10.1189 1.02029L8.80895 1.24644C8.09213 1.37017 7.60571 2.05286 7.72945 2.77822V2.80382C7.77212 3.0257 7.66545 3.2433 7.46491 3.34144C6.83342 3.64865 6.24886 4.03693 5.72831 4.48495C5.54911 4.63429 5.29736 4.64709 5.10962 4.51482L4.78961 4.28441C4.38 4.0028 3.81678 4.09667 3.5309 4.50201L2.26792 6.29834C1.97778 6.70369 2.07592 7.26691 2.48553 7.55279L2.95488 7.8856C3.12982 8.00934 3.21089 8.23121 3.14689 8.44029C3.00182 8.9139 2.89941 9.40459 2.84394 9.9038C2.81834 10.1257 2.65194 10.3049 2.43006 10.3433L1.75164 10.4585C1.25669 10.5438 0.928145 11.0089 1.01348 11.5039L1.15429 12.3146L1.23536 12.7711L1.37616 13.5903C1.4615 14.0767 1.92658 14.4053 2.40873 14.32L2.78848 14.256C3.01035 14.2176 3.23223 14.3285 3.3261 14.529C3.59064 15.0752 3.91492 15.5787 4.28613 16.048C4.42693 16.223 4.4312 16.4662 4.29893 16.6496L4.05145 16.9995C3.76984 17.4006 3.86798 17.9595 4.26479 18.2412L6.07392 19.5127C6.47927 19.8028 7.04249 19.7047 7.32837 19.2951L7.56731 18.9537C7.69531 18.7702 7.92999 18.6892 8.13906 18.766C8.69802 18.958 9.28257 19.0903 9.88419 19.1585C9.99513 19.1713 10.0933 19.2183 10.1701 19.2908C10.2469 19.3633 10.3023 19.4615 10.3237 19.5724C10.4517 20.3106 11.1472 20.8012 11.8853 20.6732L13.1952 20.4471C13.9121 20.3234 14.3942 19.6407 14.2705 18.9196V18.894C14.2363 18.7318 14.2918 18.5697 14.4027 18.4545"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.4597 18.6426L13.1444 15.3273C12.5044 14.6873 11.6212 14.3374 10.7209 14.4014C6.58206 14.6787 6.67167 11.2183 6.88501 9.78896C6.92341 9.52869 7.23915 9.42202 7.42689 9.60976L8.83921 11.0221C9.20189 11.3848 9.78644 11.3848 10.1449 11.0221L10.4819 10.685L11.0494 10.1175C11.4121 9.75483 11.4121 9.17028 11.0494 8.81186L9.6371 7.39955C9.44936 7.21181 9.55603 6.89606 9.81631 6.85766C11.2457 6.64432 14.7061 6.55472 14.4287 10.6935C14.369 11.5981 14.7189 12.4771 15.3546 13.1171L18.6699 16.4324"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ViewButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
      viewBox="0 0 17 13"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M1.20104 7.06035C1.09728 6.89092 1.0454 6.80621 1.01636 6.67554C0.994547 6.57739 0.994547 6.42261 1.01636 6.32446C1.0454 6.19379 1.09728 6.10908 1.20104 5.93965C2.05845 4.53952 4.61063 1 8.5 1C12.3894 1 14.9415 4.53952 15.799 5.93964C15.9027 6.10908 15.9546 6.19379 15.9836 6.32446C16.0055 6.42261 16.0055 6.57739 15.9836 6.67554C15.9546 6.80621 15.9027 6.89092 15.799 7.06035C14.9415 8.46048 12.3894 12 8.5 12C4.61063 12 2.05846 8.46048 1.20104 7.06035Z"
        stroke="currentColor"
        strokeWidth="0.81"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 8.85714C9.76231 8.85714 10.7856 7.80181 10.7856 6.5C10.7856 5.19819 9.76231 4.14286 8.5 4.14286C7.23769 4.14286 6.21438 5.19819 6.21438 6.5C6.21438 7.80181 7.23769 8.85714 8.5 8.85714Z"
        stroke="currentColor"
        strokeWidth="0.81"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function NotViewButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
  viewBox="0 0 17 13"
  fill="none"
  className={className}
  aria-hidden="true"
  {...props}
>
  <path
    d="M1.20104 7.06035C1.09728 6.89092 1.0454 6.80621 1.01636 6.67554C0.994547 6.57739 0.994547 6.42261 1.01636 6.32446C1.0454 6.19379 1.09728 6.10908 1.20104 5.93965C2.05845 4.53952 4.61063 1 8.5 1C12.3894 1 14.9415 4.53952 15.799 5.93964C15.9027 6.10908 15.9546 6.19379 15.9836 6.32446C16.0055 6.42261 16.0055 6.57739 15.9836 6.67554C15.9546 6.80621 15.9027 6.89092 15.799 7.06035C14.9415 8.46048 12.3894 12 8.5 12C4.61063 12 2.05846 8.46048 1.20104 7.06035Z"
    stroke="currentColor"
    strokeWidth="0.81"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
  <path
    d="M8.5 8.85714C9.76231 8.85714 10.7856 7.80181 10.7856 6.5C10.7856 5.19819 9.76231 4.14286 8.5 4.14286C7.23769 4.14286 6.21438 5.19819 6.21438 6.5C6.21438 7.80181 7.23769 8.85714 8.5 8.85714Z"
    stroke="currentColor"
    strokeWidth="0.81"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
  <path
    d="M2 11L15 2"
    stroke="currentColor"
    strokeWidth="0.81"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>
  )
}

export function EditButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
      viewBox="0 0 19 21"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M4.77024 20.3854H2.48524C1.66646 20.3854 1 19.7227 1 18.9001L1 2.79372C1 1.80356 1.80356 1 2.79372 1H12.3564C12.7068 1 13.0419 1.14091 13.2894 1.38845L16.4846 4.58363C16.6636 4.76262 16.5379 5.07109 16.2828 5.07109H13.9559C13.9559 5.07109 12.9162 5.00635 13.1904 3.87909"
        stroke="currentColor"
        strokeWidth="0.86"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.2196 20.3856H15.3398C16.1586 20.3856 16.8251 19.4069 16.8251 18.1997L16.825 14.6158"
        stroke="currentColor"
        strokeWidth="0.86"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.855 15.8485L10.2372 19.2151L7.84216 17.3554L15.3552 7.68568C15.7574 7.16584 16.5062 7.07301 17.0261 7.47527L17.5397 7.87443C18.0596 8.27669 18.1524 9.02552 17.7502 9.54536L14.5414 13.6732"
        stroke="currentColor"
        strokeWidth="0.86"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.0548 18.2693L7.8573 17.3379L7.91919 19.6153C7.91919 19.6741 7.96869 19.7144 8.02749 19.6989L10.2492 19.1976L9.0517 18.2662L9.0548 18.2693Z"
        stroke="currentColor"
        strokeWidth="0.86"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.7114 8.68439L17.0229 10.4822"
        stroke="currentColor"
        strokeWidth="0.86"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RegisterPaymentButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true" {...props}>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M166 66 C183 58 199 77 218 70 C243 60 264 60 289 70 C311 79 333 79 357 69 L307 187 L205 187 Z" stroke-width="18"/>
        <path d="M205 187 C177 218 139 249 111 292 C82 337 61 384 65 427 C69 470 91 493 132 498 L380 498 C421 493 443 470 447 427 C451 384 430 337 401 292 C373 249 335 218 307 187 Z" stroke-width="18"/>
        <path d="M205 187 H307" stroke-width="18"/>
        <path d="M257 265 V447" stroke-width="18"/>
        <path d="M306 313 C302 286 284 272 258 272 C229 272 211 289 211 315 C211 342 229 354 258 361 C288 368 307 380 307 409 C307 437 287 454 258 454 C228 454 209 437 206 410" stroke-width="18"/>
      </g>
    </svg>
  )
}

export function RegisterCollectionButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
      viewBox="0 0 23 23"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M13.1802 7.66945C12.5755 8.09795 11.8354 8.35 11.0362 8.35C8.99407 8.35 7.33863 6.70465 7.33863 4.675C7.33863 2.64535 8.99407 1 11.0362 1C12.3599 1 13.5211 1.69134 14.1743 2.73055M5.27532 19.4908H8.03293C8.39248 19.4908 8.74982 19.5333 9.09837 19.6184L12.0121 20.3221C12.6443 20.4752 13.303 20.4901 13.9418 20.3668L17.1634 19.7438C18.0144 19.579 18.7973 19.174 19.4108 18.5808L21.6901 16.3771C22.3411 15.7488 21.7872 14.7425 21.6406 14.6007C21.2993 14.2708 20.1507 14.1695 19.4877 14.65L16.8071 16.3771C16.4266 16.6535 15.9637 16.8023 15.4876 16.8023H12.9224L14.5552 16.8023C15.4755 16.8023 16.221 16.0815 16.221 15.1917V14.8696C16.221 14.1308 16.003 14.3036 15.2619 14.125L12.4397 13.308C12.0296 13.2091 11.6096 13.1591 11.1874 13.1591C10.1681 13.1591 8.32312 13.9979 8.32312 13.9979L5.22575 15.2853M20.0159 5.725C20.0159 7.75465 18.3604 9.4 16.3184 9.4C14.2763 9.4 12.6208 7.75465 12.6208 5.725C12.6208 3.69535 14.2763 2.05 16.3184 2.05C18.3604 2.05 20.0159 3.69535 20.0159 5.725ZM1 14.23L1 20.32C1 20.9081 1 21.2021 1.11514 21.4267C1.21643 21.6243 1.37804 21.7849 1.57683 21.8856C1.80281 22 2.09864 22 2.6903 22H3.53545C4.12711 22 4.42294 22 4.64893 21.8856C4.84771 21.7849 5.00932 21.6243 5.11061 21.4267C5.22575 21.2021 5.22575 20.9081 5.22575 20.32V14.23C5.22575 13.6419 5.22575 13.3479 5.11061 13.1233C5.00932 12.9257 4.84771 12.7651 4.64893 12.6644C4.42294 12.55 4.12711 12.55 3.53545 12.55L2.6903 12.55C2.09864 12.55 1.80281 12.55 1.57683 12.6644C1.37804 12.7651 1.21643 12.9257 1.11514 13.1233C1 13.3479 1 13.6419 1 14.23Z"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function DeleteButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg width="24" height="22" viewBox="0 0 24 22" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M3.08704 5.34698L4.72887 18.1663C4.93758 19.7849 6.31504 21 7.9476 21H16.2495C17.896 21 19.2827 19.7663 19.4729 18.1292L19.8207 15.1191" stroke="currentColor" stroke-width="0.86" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20.062 13.046L20.9525 5.34698" stroke="currentColor" stroke-width="0.86" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9.69165 18.3272V8.02173" stroke="currentColor" stroke-width="0.86" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14.348 8.02173V18.3272" stroke="currentColor" stroke-width="0.86" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15.4889 5.00255V2.87373C15.4889 1.83947 14.6494 1 13.6152 1H10.4196C9.38537 1 8.5459 1.83947 8.5459 2.87373V5.00255" stroke="currentColor" stroke-width="0.86" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M1 5.05911H9.6915H23.0395" stroke="currentColor" stroke-width="0.86" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  )
}

export function FilterButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M4 6h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 12h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 18h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ClearFilterButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M4 6h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 12h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 18h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 5l14 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChevronDownButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChevronUpButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="m18 15-6-6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CloseButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m6 6 12 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CloseDebtButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (   
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true" {...props}>
      <circle cx="9" cy="9" r="8.57" stroke="currentColor" stroke-width="0.86"/>
      <g transform="rotate(45 9 9)">
        <path d="M9.125 4.77881V13.9712" stroke="currentColor" stroke-width="0.86" stroke-linecap="round" />
        <path d="M13.7212 9.375L4.5288 9.375" stroke="currentColor" stroke-width="0.86" stroke-linecap="round" />
      </g>
    </svg>
  )
}

export function NewDebtButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (   
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className} {...props}>
      <circle cx="9" cy="9" r="8.57" stroke="currentColor" stroke-width="0.86"/>
      <path d="M9.125 4.77881V13.9712" stroke="currentColor" stroke-width="0.86" stroke-linecap="round"/>
      <path d="M13.7212 9.375L4.5288 9.375" stroke="currentColor" stroke-width="0.86" stroke-linecap="round"/>
    </svg>
  )
}


export function NewAccountButtonIcon({
  className = '',
  ...props
}: IconAssetProps) {
  return (   
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" className={className} {...props}>
      <path d="M20.9192 23.3394C19.5848 23.9467 18.0111 23.9882 16.5755 23.321C13.9896 22.1154 12.8669 19.0372 14.077 16.4513C15.2872 13.8607 18.3654 12.7472 20.9514 13.9528C23.5373 15.1583 24.66 18.2366 23.4499 20.8271C23.2198 21.324 22.9161 21.7657 22.5618 22.1476" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18.7656 16.4277V20.8458" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20.9751 18.6367H16.5571" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18.793 7.7041V11.961" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M11.6198 18.6367H2.62885C1.7316 18.6367 1 17.9097 1 17.0079V2.96935C1 1.88345 1.88345 1 2.96935 1H13.4695C13.856 1 14.2241 1.15184 14.4956 1.42332L18.0017 4.9295C18.1996 5.12735 18.057 5.46325 17.7809 5.46325H15.2272C15.2272 5.46325 14.0861 5.38962 14.3851 4.15648" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5.84521 14.1367H11.6612" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5.84521 10.1201H14.1091" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  )
}