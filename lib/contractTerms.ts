export interface TermSubItem {
  enKey: string;
  arKey: string;
  en: string;
  ar: string;
}

export interface ContractTerm {
  num: number;
  en: string;
  ar: string;
  subItems?: TermSubItem[];
}

export const CONTRACT_TERMS: ContractTerm[] = [
  {
    num: 1,
    en: 'Unless the context conflicts, the word "vehicle" means the vehicle described on the front of this contract, along with all its accessories.',
    ar: 'ما لم يتعارض ذلك من السياق فإن كلمة "مركبة" تعني السيارة بموجب هذا العقد والموصوفة في واجهة العقد مع كافة لوازمها.'
  },
  {
    num: 2,
    en: 'The lessee acknowledges that the vehicle was delivered to him in good condition and free of any defects.',
    ar: 'يقر المستأجر أن السيارة سلمت إليه بحالة جيدة وخالية من أي عيوب.'
  },
  {
    num: 3,
    en: 'The lessee agrees to take proper care of and use the vehicle.',
    ar: 'يوافق المستأجر على رعاية واستخدام السيارة بشكل جيد.'
  },
  {
    num: 4,
    en: 'The hirer guarantees and undertakes that he is duly licensed to drive the vehicle, and that he has provided and given correct information regarding his status within the country (visitor or resident), otherwise he will be fully responsible for any legal accountability.',
    ar: 'يضمن المستأجر ويتعهد بأنه مرخص حسب الأصول لقيادة السيارة، وأنه قدم وأدلى بمعلوماته الصحيحة والتي تتعلق بوضعه داخل الدولة (زائر أو مقيم) وخالف ذلك يكون مسؤولاً مسؤولية كاملة عن أي مسائلة قانونية.'
  },
  {
    num: 5,
    en: 'The hirer understands that the vehicle is for use within the United Arab Emirates only and cannot be taken to the borders of neighboring countries. The hirer is also not permitted to give the vehicle to any other person.',
    ar: 'يدرك المستأجر أن السيارة للإستخدام داخل دولة الإمارات العربية المتحدة فقط ولا يمكن أن تؤخذ إلى حدود البلدان المجاورة، كما لا يسمح بأن يعطي السيارة لأي شخص آخر.'
  },
  {
    num: 6,
    en: 'The company does not pay fuel costs (petroleum) if the fuel level is lower than the level upon final delivery of the car. If the car is delivered with less fuel, the company has the right to take between 50 and 250 AED, and the hirer must return the car in the same condition in which it was delivered, with the fuel tank rate.',
    ar: 'الشركة لا تسدد تكاليف الوقود (البترول) في حالة إنخفاض مستوى الوقود عن المستوى عند تسليم السيارة بشكل نهائي وفي حال سلمت السيارة ناقصة من الوقود يحق للشركة أخذ ما بين 50 إلى 250 درهم، ويجب على المستأجر إعادة السيارة في نفس الحالة التي سلم بها معدل خزان الوقود.'
  },
  {
    num: 7,
    en: 'The permissible distance is 200 kilometers per day. Any excess distance of 5-50 dirhams will be calculated depending on the vehicle type specified in the contract.',
    ar: 'المسافة المسموح بها 200 كيلومتر في اليوم الواحد وتحتسب الزيادة عن ذلك من (5 - 50) درهم اعتماداً على نوع السيارة المذكورة في مقدمة العقد.'
  },
  {
    num: 8,
    en: 'The hirer is obligated to pay the rental value in advance and to pay any traffic violations and toll gate fees during the rental period.',
    ar: 'يلتزم المستأجر بدفع قيمة الإيجار مقدماً ودفع قيمة المخالفات المرورية ورسوم بوابات التعرفة المرورية خلال فترة الإيجار.'
  },
  {
    num: 9,
    en: 'If the vehicle is returned one hour after the return time specified in the contract, this will be considered a full, non-separable day.',
    ar: 'في حال إعادة السيارة بعد وقت التسليم بساعة والمسجل بمقدمة العقد يعتبر يوماً كاملاً لا يتجزأ.'
  },
  {
    num: 10,
    en: 'The rent paid by the hirer is non-refundable, except for the security deposit.',
    ar: 'قيمة الإيجار المسددة من قبل المستأجر غير مستردة عدى مبلغ التأمين.'
  },
  {
    num: 11,
    en: 'If the hirer pays the security deposit in cash or by credit card, the amount will be returned to the customer within 21 business days, provided there are no outstanding violations or deductions.',
    ar: 'في حال دفع المستأجر التأمين نقداً أو عن طريق بطاقة الإئتمان يتم إرجاع المبلغ للعميل بعد 21 يوماً عمل إذ لم يكن هناك أي مخالفات أو خصومات مستحقة عليه.'
  },
  {
    num: 12,
    en: "The driver's (hirer) license must be valid for at least 6 months. In the event of an accident (caused by the driver), the hirer must pay 30% of the repair cost.",
    ar: 'رخصة القيادة يجب أن لا تقل صلاحيتها عن 6 أشهر وفي حال وقوع حادث (متسبب) على المستأجر سداد 30% من قيمة الإصلاحات.'
  },
  {
    num: 13,
    en: 'If the hirer repairs the vehicle at an external dealership or workshop, a fine of AED 50,000 will be payable to the company.',
    ar: 'في حال إصلاح المركبة من قبل المستأجر في وكالة أو ورشة خارجية يترتب عليه غرامة مالية قدرها 50000 درهم لصالح الشركة.'
  },
  {
    num: 14,
    en: 'The hirer is responsible for returning the vehicle to the company immediately if it needs an oil change (for maintenance), and the company must return it to him immediately after completing the service. This service shall not be performed by the hirer without the company’s approval. If the company sends a request to the hirer for maintenance and the hirer is late after the deadline, the hirer bears full responsibility for any resulting malfunctions.',
    ar: 'المستأجر مسؤول عن إعادة السيارة للشركة فوراً في حال احتياجها لتغير الزيوت (للصيانة) ويجب على الشركة إعادتها إليه فور إتمام الخدمة، ولا يتم تنفيذ هذه الخدمة من قبل المستأجر بدون موافقة الشركة، وفي حال قيام الشركة بإرسال طلب إلى العميل للصيانة وتأخر عن الموعد النهائي، يتحمل العميل المسؤولية كاملة عن أي أعطال ناتجة عن ذلك.'
  },
  {
    num: 15,
    en: 'The hirer shall be obligated to pay the full amount of repairs and daily rentals for the vehicle if it is stopped due to damage or defect resulting from his negligence.',
    ar: 'يكون المستأجر ملزم بدفع كامل مبلغ الإصلاحات والإيجارات اليومية للمركبة إذ تم إيقافها بسبب الضرر أو العيب الناتج عن إهماله.'
  },
  {
    num: 16,
    en: 'In the event of scratches, collisions, or accidents:',
    ar: 'في حالة الخدوش والصدم والحوادث:',
    subItems: [
      {
        enKey: 'a)',
        arKey: 'أ)',
        en: 'The hirer must report the accident to the police and the company at the time of the accident.',
        ar: 'يجب على المستأجر إبلاغ الشرطة والشركة في ذات وقت الحادث.'
      },
      {
        enKey: 'b)',
        arKey: 'ب)',
        en: 'The hirer must obtain an accident report, submit it to the company, and pay the mandatory deductible mentioned in the introduction to the contract.',
        ar: 'يجب على المستأجر الحصول على تقرير الحادث وتسليمه للشركة وسداد مبلغ التحمل الإجباري المذكور في مقدمة العقد.'
      },
      {
        enKey: 'c)',
        arKey: 'ت)',
        en: 'In the event that the accident report or the final police report is not obtained, the hirer is responsible for all damages because the insurance company will not compensate the company without obtaining this report. The contract remains open until the vehicle is fully repaired and returned to its pre-accident condition.',
        ar: 'في حالة عدم الحصول على تقرير الحادث أو التقرير النهائي للشرطة يكون المستأجر مسؤولاً عن كافة الأضرار لأن شركة التأمين لن تقوم بتعويض الشركة بدون الحصول على هذا التقرير، ويبقى العقد مفتوحاً حتى تمام إصلاح المركبة وعودتها إلى حالتها قبل الحادث.'
      },
      {
        enKey: 'd)',
        arKey: 'ث)',
        en: 'If the accident file is referred to the Public Prosecution and then to the court, the hirer must provide the company with the final judgment and a certificate of finality of the judgment, and pay the mandatory deductible amount mentioned in the introduction to the contract and any other costs that must be paid.',
        ar: 'في حال تم إحالة ملف الحادث إلى النيابة العامة ومنها إلى المحكمة يتوجب على المستأجر تزويد الشركة بالحكم النهائي وشهادة بنهائية الحكم، وسداد مبلغ التحمل الإجباري المذكور في مقدمة العقد وأي تكاليف أخرى مستوجبة السداد.'
      },
      {
        enKey: 'e)',
        arKey: 'ج)',
        en: 'If the accident occurs to the hirer while he is under the influence of alcohol or any narcotic substances, he is obligated to pay the rent and the repairs resulting from the accident during the repair period and until the vehicle is fully repaired and returned to operation. In the event that the vehicle is total loss, the hirer is responsible for paying the full value of the vehicle to the company.',
        ar: 'إذا وقع الحادث للمستأجر وهو تحت تأثير الكحول أو أي مواد مخدرة فإنه يكون ملزماً بسداد قيمة الإيجار وقيمة الإصلاحات الناتجة عن الحادث خلال فترة الإصلاح وحتى تمام إصلاح المركبة وعودتها للعمل، وفي حال شطب المركبة يتحمل المستأجر سداد كامل قيمة المركبة لصالح الشركة.'
      },
      {
        enKey: 'f)',
        arKey: 'ح)',
        en: 'The hirer shall be obligated to pay the full amount of repairs and daily rentals for the vehicle if it is stopped due to damage or defect resulting from the hirer’s negligence.',
        ar: 'يكون المستأجر ملزم بدفع كامل مبلغ الإصلاحات والإيجارات اليومية للمركبة إذ تم إيقافها بسبب الضرر أو العيب الناتج عن إهمال المستأجر.'
      },
      {
        enKey: 'g)',
        arKey: 'خ)',
        en: 'In the event that the insurance company refuses to compensate the company that owns the vehicle for reasons related to the hirer’s violation of the UAE traffic laws, the hirer shall bear all responsibility for this and shall bear the value of the vehicle mentioned in the insurance policy in the event of its being total loss, or the cost of its repair and the period of its being stopped during the repair.',
        ar: 'في حال رفض شركة التأمين تعويض الشركة مالكة المركبة لأسباب خاصة بمخالفة المستأجر لقوانين السير والمرور بالدولة يتحمل المستأجر كافة المسؤولية عن ذلك ويتحمل قيمة المركبة المذكورة في بوليصة التأمين حال شطبها أو قيمة إصلاحها وفترة توقفها خلال الإصلاح.'
      },
      {
        enKey: 'h)',
        arKey: 'د)',
        en: 'If the hirer’s intentional or unintentional error causes the company to lose the agency warranty on the vehicle, the manufacturer shall bear the responsibility of paying the purchase price of the vehicle’s warranty contract and bearing all expenses related to repairing the vehicle.',
        ar: 'في حال تسبب خطأ المستأجر المقصود أو غير المقصود في خسارة الشركة لضمان الوكيل والمصنع على المركبة يتحمل مسؤولية سداد قيمة شراء عقد الضمان الخاصة بالمركبة وتحمل كافة المصاريف الخاصة بإصلاح المركبة.'
      }
    ]
  },
  {
    num: 17,
    en: 'If no third party is involved in any accident, the hirer is fully responsible.',
    ar: 'وفي حال عدم وجود طرف ثاني بأي حادث يكون المستأجر هو المسؤول مسؤولية كاملة.'
  },
  {
    num: 18,
    en: 'If the hirer causes an accident, he/she must pay the deductible compensation amount, which varies from one vehicle to another, and is stated in the introduction to the contract in the “mandatory deductible” section, along with paying the full rental value during the repair period, or until the final decision to total loss the vehicle is issued by the insurance company in writing.',
    ar: 'في حال تسبب المستأجر في حادث، يجب عليه دفع مبلغ التعويض القابل للخصم والذي يختلف من مركبة إلى أخرى، والمذكور في مقدمة العقد في خانة "التحمل الإجباري" مع دفع كامل قيمة الإيجار خلال فترة الإصلاح، أو حتى صدور القرار النهائي بشطب المركبة بشكل خطي من قبل شركة التأمين.'
  },
  {
    num: 19,
    en: 'If the accident is not the hirer’s fault (the lessee is the injured party), they are only required to pay the daily rental value until the vehicle is repaired.',
    ar: 'إذا كان الحادث ليس خطأ المستأجر (متضرر) فعليه دفع قيمة الإيجار اليومي فقط حتى خروج المركبة من الإصلاح.'
  },
  {
    num: 20,
    en: "In the event of total vehicle damage (total loss) and the hirer’s official documents are valid, the lessee shall pay 30% of the vehicle's price if they are at fault. Otherwise, the hirer shall bear the full value of the vehicle according to the value stated in the insurance policy.",
    ar: 'في حالة التلف الكلي للمركبة (الشطب) ومستندات المستأجر الرسمية صحيحة يدفع المستأجر قيمة 30% من سعر المركبة في حالة كان متسبب وعكس ذلك يتحمل المستأجر قيمة المركبة كاملة حسب القيمة الواردة في بوليصة التأمين.'
  },
  {
    num: 21,
    en: 'The hirer must park the vehicle in a safe place, away from any hazards that could cause damage, such as rain, hail, wind, or construction sites. Otherwise, the hirer is responsible for paying the full amount of repairs, as insurance companies do not compensate the company in these cases.',
    ar: 'على المستأجر إيقاف المركبة في مكان آمن وليست عرضة لأي خطر يمكن أن يتسبب بتلفها سواء أمطار أو برد أو رياح أو مواقع أعمال الإنشاءات وخالف ذلك يكون المستأجر مسؤولاً عن دفع كامل مبلغ الإصلاحات وذلك كون شركات التأمين لا تعوض الشركة في هذه الحالات.'
  },
  {
    num: 22,
    en: 'The hirer is responsible for any complaints regarding the vehicle from official authorities during the rental period.',
    ar: 'يكون المستأجر مسؤول عن أي شكوى في شأن المركبة من قبل السلطات الرسمية خلال فترة الإيجار.'
  },
  {
    num: 23,
    en: 'The hirer shall be solely responsible if the vehicle is used to transport prohibited or illegal substances according to the state law. If he is arrested for this, the hirer shall bear the legal consequences and pay the full rental value and financial fines until the settlement is completed and the vehicle is returned to the company’s possession in the same condition in which he received it.',
    ar: 'يكون المستأجر المسؤول الوحيد إذا كانت السيارة تستخدم لنقل المواد المحظورة أو الغير قانونية وفقاً لقانون الدولة وإذ تم القبض عليه بسبب ذلك يتحمل المستأجر التبعات القانونية ويدفع كامل قيمة الإيجار والغرامات المالية حتى تمام التسوية وعودة المركبة لحيازة الشركة وبذات الحالة التي استلمها بها.'
  },
  {
    num: 24,
    en: 'In the event that the hirer commits traffic violations that require the vehicle to be impounded, he shall be responsible for paying the value of the violations, the value of the vehicle impoundment fee, the ground fees in the impoundment area, the transport truck fees, and any other related fees. He shall also be responsible for paying the value of the daily rental until the vehicle is returned to the company’s possession in the same condition in which he received it.',
    ar: 'في حال إرتكب المستأجر مخالفات مرورية تستوجب حجز المركبة يكون بذلك مسؤول عن سداد قيمة المخالفات وقيمة بدل حجز المركبة ورسوم الأرضيات بمنطقة الحجز ورسوم شاحنة النقل وأي رسوم أخرى بهذا الشأن، وكذلك يكون مسؤولاً عن سداد قيمة الإيجار اليومي حتى عودة المركبة لحيازة الشركة وبذات الحالة التي استلمها بها.'
  },
  {
    num: 25,
    en: 'The hirer also agrees to pay all fines related to traffic violations or parking violations, including government knowledge and innovation fees (AED 20) and traffic toll gate fees, and also authorizes Lion Car Rental LLC to debit the credit card through automatic vending machines, even in the event of later notification Lion Rent a Car LLC has the full right to deduct fees such as traffic violations, parking violations, Department of Transport, toll gate fees or other violations incurred by the vehicle even after the contract is closed.',
    ar: 'يوافق المستأجر أيضاً بأن يدفع كافة الغرامات المتعلقة بمخالفات المرور أو مخالفات المواقف بما في ذلك رسوم المعرفة والابتكار الحكومية (20 درهم) ورسوم عبور بوابات التعرفة المرورية ويفوض شركة ليون لتأجير السيارات ش.ذ.م.م أيضاً بالخصم على بطاقة الإئتمان من خلال مكائن البيع الأتوماتيكية حتى في حالة الإخطار لاحقاً فإن لشركة ليون لتأجير السيارات ش.ذ.م.م الحق الكامل في استقطاع الرسوم مثل المخالفات المرورية ومواقف السيارات ودائرة النقل ورسوم عبور بوابات التعرفة المرورية أو غيرها من المخالفات المترتبة على المركبة حتى بعد إغلاق العقد.'
  },
  {
    num: 26,
    en: 'The hirer shall pay the company:',
    ar: 'يدفع المستأجر للشركة:',
    subItems: [
      {
        enKey: 'a)',
        arKey: 'أ)',
        en: 'Insurance to cover any future violations, fees, or damages.',
        ar: 'التأمين لتغطية قيمة أي مخالفات مستقبلية أو رسوم أو أضرار.'
      },
      {
        enKey: 'b)',
        arKey: 'ب)',
        en: 'Rental fees.',
        ar: 'رسوم الإيجار.'
      },
      {
        enKey: 'c)',
        arKey: 'ج)',
        en: 'The mandatory deductible specified in the contract in the event of accidents or damage to the vehicle during the hirer’s possession.',
        ar: 'التحمل الإجباري المحدد بالعقد في حال الحوادث أو وقوع أضرار على المركبة خلال حيازة المستأجر لها.'
      }
    ]
  },
  {
    num: 27,
    en: 'The hirer undertakes not to use the vehicle to tow another vehicle or install a trailer, not to enter sandy or desert areas, and not to show off the vehicle under any circumstances. In the event of violating this condition, he bears all legal responsibility and any financial claims from the company as a result of this unlicensed violation, the hirer shall bear a fine of AED 25,000, in addition to the cost of any damages that may be incurred by the vehicle as a result of any of these actions.',
    ar: 'يتعهد المستأجر بعدم استخدام المركبة في قطر مركبة أخرى أو تركيب مقطورة، وعدم دخول المناطق الرملية أو الصحراوية، وكذلك عدم الاستعراض بالمركبة في أي حال من الأحوال وفي حال خالف هذا الشرط يتحمل كافة المسؤولية القانونية وأي مطالبات مالية من الشركة جراء هذه المخالفة الغير مرخصة، ويتحمل المستأجر غرامة مالية بقيمة 25000 درهم، بالإضافة لقيمة أي أضرار قد تلحق المركبة جراء أي فعل من هذه الأفعال.'
  },
  {
    num: 28,
    en: 'In the event of any mechanical failure of the vehicle itself during the rental period, the hirer shall immediately hand the vehicle over to the company for inspection by the agent of the same type of vehicle in the country to verify the cause of the failure. If it is proven that the failure was due to the hirer’s negligence or shortcomings, the hirer shall bear the cost of repairs as well as the daily rental value until the vehicle is back in operation.',
    ar: 'في حالة حدوث أي عطل ميكانيكي للسيارة ذاتها أثناء مدة الإيجار يقوم المستأجر فوراً بتسليم السيارة للشركة للكشف عليها لدى وكيل ذات نوع المركبة بالدولة والتأكد من سبب العطل وفي حال تبين أن العطل بسبب إهمال أو تقصير المستأجر يتحمل المستأجر قيمة تكاليف الإصلاحات وكذلك قيمة الإيجار اليومي حتى عودة المركبة للعمل.'
  },
  {
    num: 29,
    en: 'In the event of exceeding the speed limit of 160 km/h, the company has the right to fine the hirer 2,000AED, and in the event of 200 km/h, the fine is 5,000AED in favor of the company. The company has the right to seize the vehicle and not return the rental and insurance amount to the hirer.',
    ar: 'في حال السرعة الزائدة بما يفوق 160 كم/ساعة يحق للشركة تغريم المستأجر مبلغ 2000 درهم، وفي حال كانت 200 كم/ساعة تكون الغرامة 5000 درهم لصالح الشركة ويحق للشركة سحب السيارة وعدم إرجاع مبلغ الإيجار والتأمين للمستأجر.'
  },
  {
    num: 30,
    en: 'It is prohibited to use the vehicle in mountainous areas and it is prohibited to ascend the roads leading to Jebel Jais, Jebel Hafeet or any roads leading to the mountain peaks. A fine of 50,000AED is imposed on the hirer who violates this clause specifically.',
    ar: 'يمنع استخدام المركبة في المناطق الجبلية ويمنع صعود المركبة الطرقات المؤدية إلى جبل جيس وجبل حفيت أو أي طرق مؤدية إلى قمم الجبال وتفرض غرامة مالية بقيمة 50000 درهم على المستأجر المخالف لهذا البند بالتحديد.'
  },
  {
    num: 31,
    en: 'It is strictly prohibited to use the vehicle in official or unofficial races or to race on roads or within race tracks. A fine of 20,000 dirhams will be imposed on the hirer who violates this clause specifically.',
    ar: 'يمنع استخدام المركبة في السباقات الرسمية وغير الرسمية أو التسابق على الطرقات وداخل حلبات السباقات نهائياً وتفرض غرامة مالية بقيمة 20000 درهم على المستأجر المخالف لهذا البند بالتحديد.'
  },
  {
    num: 32,
    en: 'The hirer undertakes that the vehicle will not be driven by anyone whose name is not mentioned in the contract and who is not duly licensed.',
    ar: 'يتعهد المستأجر بأنه لن يقود السيارة أي شخص لم يذكر إسمه في العقد وغير مرخص أصولاً.'
  },
  {
    num: 33,
    en: 'The hirer guarantees that no materials will be transported that could cause damage to the vehicle or its interior upholstery. Otherwise, the hirer will bear the costs of damage, which are estimated based on the inspection of the authorized dealer\'s workshop in the country. Cleaning costs range from AED 500 to AED 1,500.',
    ar: 'يضمن المستأجر عدم نقل أية مواد قد تسبب أضرار للسيارة أو فرشها الداخلي وخالف ذلك يتحمل تكاليف الأضرار والتي تقدر حسب معاينة ورشة الوكيل المعتمد بالدولة، أما التنظيف فتتراوح قيمته بين 500 درهم إلى 1500 درهم.'
  },
  {
    num: 34,
    en: 'The hirer is prohibited from subleasing the vehicle or relinquishing possession of it during the rental period.',
    ar: 'يمنع المستأجر خلال مدة الإيجار من تأجير السيارة من الباطن أو التخلي عن حيازتها.'
  },
  {
    num: 35,
    en: 'The hirer guarantees and acknowledges that all the information and data he has provided on the back of this page are true and correct and that this contract has been entered into based on the credibility of that data.',
    ar: 'يضمن المستأجر ويقر بأن كافة المعلومات والبيانات التي قام بإعطائها في ظهر هذه الصفحة حقيقة وصحيحة وأنه قد تم الدخول في هذا العقد بناء على مصداقية تلك البيانات.'
  },
  {
    num: 36,
    en: 'In the event that the hirer commits any breach of any of the terms of the contract or in the event that any person uses the car during the contract period in a manner that the company considers to be unfair to its rights and interests therein, the company has the right to cancel this contract immediately and take possession of the car without prejudice to any of the company’s rights arising from this contract or the law, In particular, without prejudice to the Company\'s rights to claim rental fees due under this agreement and/or damages.',
    ar: 'في حالة ارتكاب المستأجر لأي إخلال بأي شرط من شروط العقد أو في حالة استعمال أي شخص للسيارة أثناء مدة العقد على نحو تعتبره الشركة مجحفاً بحقوقها ومصالحها فيه فإنه يحق للشركة إلغاء هذا العقد فوراً وحيازة السيارة بدون المساس بأي حق من حقوق الشركة المترتبة على هذا العقد أو القانون وبالأخص بدون إجحاف بحقوق الشركة للمطالبة برسوم الإيجار المستحقة وفقاً لهذا العقد و/ أو الأضرار.'
  },
  {
    num: 37,
    en: 'The vehicle must be used in a manner that does not violate the general laws issued by the competent authorities in the United Arab Emirates. The hirer shall bear full responsibility for any action that violates these instructions.',
    ar: 'يجب استعمال السيارة بشكل لا يخالف القوانين العامة والصادرة من الجهات المختصة بدولة الإمارات العربية المتحدة ويكون على عاتق المستأجر كامل المسؤولية على أي تصرف يخالف تلك التعليمات.'
  },
  {
    num: 38,
    en: 'The company is not responsible for the loss of any personal belongings belonging to the hirer after the vehicle is delivered.',
    ar: 'الشركة غير مسؤولة عن فقدان أي أغراض شخصية تتعلق بالمستأجر بعد تسليم السيارة.'
  },
  {
    num: 39,
    en: 'The hirer is responsible for paying the value of the stolen vehicle due to their negligence (failure to lock the vehicle, leaving the key in the car, etc.).',
    ar: 'المستأجر هو المسؤول عن دفع قيمة السيارة المسروقة من نتيجة إهماله (عدم إقفال السيارة، ترك المفتاح في السيارة....إلخ).'
  },
  {
    num: 40,
    en: 'Smoking is prohibited inside the rented vehicle. If the hirer or passenger smokes inside the vehicle, hirer is liable to pay a fine ranging from AED 200 to AED 400.',
    ar: 'يحظر التدخين داخل السيارة المستأجرة إذ كان السائق أو الراكب يدخن داخل السيارة، فهم مسؤولون عن دفع غرامة تتراوح بين 200 درهم إلى 400 درهم.'
  },
  {
    num: 41,
    en: 'If the hirer returns the rented vehicle unclean inside or out, he or she must pay an amount of AED 200 to AED 500.',
    ar: 'إذا سلم المستأجر المركبة المستأجرة وهي غير نظيفة من الخارج أو الداخل يتوجب عليه سداد مبلغ 200 درهم إلى 500 درهم.'
  },
  {
    num: 42,
    en: 'The hirer must hand over the vehicle in person at the end of the contract period, as he is the one who signed the contract. Otherwise, the contract is considered valid until he is present and hands over the vehicle in person to the company or one of its employees representing it.',
    ar: 'يجب على المستأجر تسليم السيارة عند إنتهاء مدة العقد بشخصه كونه هو من وقع على العقد وعدا ذلك يعتبر العقد سارياً حتى حضوره وتسليم المركبة بشخصه إلى الشركة أو من يمثلها من موظفيها.'
  },
  {
    num: 43,
    en: 'If the hirer leaves the vehicle in a public parking lot, airport parking lot, or hotel parking lot and leaves the country, he will be subject to legal accountability and prosecution. In this case, the company must notify the police to verify the situation and open the vehicle with the help of police officers, receive it through an official report, and prove its contents and any damages. The contract remains open until all procedures are completed.',
    ar: 'قيام المستأجر بترك المركبة في المواقف العامة أو مواقف المطار أو مواقف الفندق ومغادرة الدولة يعرضه للمسائلة والملاحقة القانونية حيث يتوجب في هذه الحالة قيام الشركة بإبلاغ الشرطة لعمل إثبات حالة وفتح المركبة بمعرفة رجال الشرطة واستلامها عبر محضر رسمي وإثبات محتوياتها والأضرار التي بها، ويبقى العقد مفتوحاً حتى إتمام كافة الإجراءات.'
  },
  {
    num: 44,
    en: 'The hirer authorizes the company to contact the bank and collect any amounts due from him, including traffic violations, damages, and rental fees, from his or her personal bank account.',
    ar: 'يخول المستأجر الشركة بمخاطبة البنك وتحصيل أي مبالغ مستحقة عليه سواء مخالفات مرورية، قيمة أضرار وقيمة إيجار من حسابه الشخصي لدى البنك.'
  },
  {
    num: 45,
    en: 'The hirer, by virtue of this contract, has chosen the United Arab Emirates as his chosen domicile for the purposes of implementing this contract, and shall be the address to which all warnings and notifications shall be delivered.',
    ar: 'اختار المستأجر بموجب هذا العقد موطناً مختاراً له دولة الإمارات العربية المتحدة لأغراض تنفيذ هذا العقد عنوان إقامته بحيث يتم تبليغ كافة الإنذارات والتبليغات إليه.'
  }
];
