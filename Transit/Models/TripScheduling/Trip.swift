import Foundation

public struct Trip: Codable{
    let key: Int?
    let previousTripKey: Int?
    let variant: VariantT?
    let effectiveFrom: String?
    let effectiveTo: String?
    let scheduleType: String?
    let scheduledStops: [SchduledStopT]?
}
